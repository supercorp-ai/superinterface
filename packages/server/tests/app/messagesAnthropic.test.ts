import { testApiHandler } from 'next-test-api-route-handler'
import assert from 'node:assert'
import { TextDecoder } from 'node:util'
import { describe, it } from 'node:test'
import {
  ApiKeyType,
  HandlerType,
  MethodType,
  MessageRole,
  ModelProviderType,
  RunStatus,
  StorageProviderType,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTestWorkspace } from '../lib/workspaces/createTestWorkspace'
import { createTestModelProvider } from '../lib/modelProviders/createTestModelProvider'
import { createTestAssistant } from '../lib/assistants/createTestAssistant'
import { createTestApiKey } from '../lib/apiKeys/createTestApiKey'

const STREAM_ID = 'a1c19514-7623-400e-abeb-7b4defeebdbb'

describe('/api/messages anthropic tool calls', () => {
  it('handles anthropic request tool calls with empty arguments', async (t) => {
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) {
      t.skip('ANTHROPIC_API_KEY is not configured')
      return
    }

    const workspace = await createTestWorkspace()

    const modelProvider = await createTestModelProvider({
      data: {
        workspaceId: workspace.id,
        type: ModelProviderType.ANTHROPIC,
        apiKey: anthropicKey,
      },
    })

    const assistant = await createTestAssistant({
      data: {
        workspaceId: workspace.id,
        modelProviderId: modelProvider.id,
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        modelSlug: 'claude-3-5-sonnet-20241022',
        instructions:
          'Always call the getComments function before responding to the user.',
      },
    })

    const fn = await prisma.function.create({
      data: {
        assistantId: assistant.id,
        openapiSpec: {
          name: 'getComments',
          description:
            'Get latest comments from stream viewers. Latest comments are at the start of the list.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
      },
    })

    await prisma.handler.create({
      data: {
        functionId: fn.id,
        type: HandlerType.REQUEST,
        requestHandler: {
          create: {
            url: `https://mini-app.superstream.sh/api/streams/${STREAM_ID}/comments`,
            method: MethodType.GET,
            headers: {},
            body: {},
          },
        },
      },
    })

    const publicKey = await createTestApiKey({
      data: {
        workspaceId: workspace.id,
        type: ApiKeyType.PUBLIC,
      },
    })

    const appHandler = await import('../../src/app/api/messages/route')

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assistantId: assistant.id,
            publicApiKey: publicKey.value,
            content:
              'Call getComments to fetch the latest viewer messages for the stream, then summarize them.',
          }),
        })

        assert.strictEqual(response.status, 200)
        assert.ok(response.body, 'response body missing')

        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let requiresActionEvent: any | null = null
        let threadId: string | null = null

        let buffer = ''

        const tryParseBuffer = () => {
          const trimStart = () => {
            let i = 0
            while (i < buffer.length && /\s/.test(buffer[i] ?? '')) {
              i += 1
            }
            if (i > 0) {
              buffer = buffer.slice(i)
            }
          }

          const extractNextJson = () => {
            trimStart()
            if (!buffer.startsWith('{')) {
              return null
            }

            let depth = 0
            let inString = false
            let escaped = false

            for (let i = 0; i < buffer.length; i += 1) {
              const char = buffer[i]!

              if (inString) {
                if (escaped) {
                  escaped = false
                } else if (char === '\\') {
                  escaped = true
                } else if (char === '"') {
                  inString = false
                }

                continue
              }

              if (char === '"') {
                inString = true
              } else if (char === '{') {
                depth += 1
              } else if (char === '}') {
                depth -= 1

                if (depth === 0) {
                  return {
                    json: buffer.slice(0, i + 1),
                    nextIndex: i + 1,
                  }
                }
              }
            }

            return null
          }

          while (true) {
            const next = extractNextJson()
            if (!next) break

            const parsed = JSON.parse(next.json)

            if (parsed.event === 'thread.created') {
              threadId = parsed.data.id
            } else if (parsed.event === 'thread.run.requires_action') {
              requiresActionEvent = parsed
            }

            buffer = buffer.slice(next.nextIndex)
          }
        }

        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          tryParseBuffer()
        }

        buffer = buffer.trim()
        assert.strictEqual(buffer.length, 0, 'unparsed stream buffer data')

        assert.ok(threadId, 'thread id not emitted')
        assert.ok(requiresActionEvent, 'requires_action event not emitted')

        const streamingToolCall =
          requiresActionEvent.data.required_action?.submit_tool_outputs
            ?.tool_calls?.[0]

        assert.ok(streamingToolCall, 'tool call missing from stream event')
        assert.strictEqual(streamingToolCall.function?.arguments, '{}')

        const run = await prisma.run.findFirstOrThrow({
          where: { threadId: threadId! },
          orderBy: { createdAt: 'desc' },
        })

        assert.strictEqual(run.status, RunStatus.COMPLETED)

        const assistantMessages = await prisma.message.findMany({
          where: { threadId: threadId!, role: MessageRole.ASSISTANT },
          orderBy: { createdAt: 'asc' },
        })

        const toolCallMessage = assistantMessages.find(
          (message) =>
            Array.isArray(message.toolCalls) &&
            (message.toolCalls as any[]).length > 0,
        )

        assert.ok(toolCallMessage, 'no assistant message stored tool call')

        const storedToolCall = (toolCallMessage!.toolCalls as any[])[0]
        assert.strictEqual(storedToolCall.function?.arguments, '{}')

        const failureLogs = await prisma.log.findMany({
          where: {
            threadId: threadId!,
            message: {
              contains: 'Failed parsing request function arguments',
            },
          },
        })

        assert.strictEqual(
          failureLogs.length,
          0,
          'unexpected failure log recorded',
        )
      },
    })
  })
})
