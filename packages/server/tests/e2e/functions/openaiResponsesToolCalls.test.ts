import assert from 'node:assert'
import { after, afterEach, before, describe, it } from 'node:test'
import {
  ApiKeyType,
  HandlerType,
  ModelProviderType,
  StorageProviderType,
  TransportType,
} from '@prisma/client'
import { createTestWorkspace } from '../../lib/workspaces/createTestWorkspace'
import { createTestModelProvider } from '../../lib/modelProviders/createTestModelProvider'
import { createTestAssistant } from '../../lib/assistants/createTestAssistant'
import { createFakeLlmAssistant } from '../../lib/assistants/createFakeLlmAssistant'
import { createTestApiKey } from '../../lib/apiKeys/createTestApiKey'
import { createTestComputerUseTool } from '../../lib/tools/createTestComputerUseTool'
import { createTestMcpServer } from '../../lib/mcpServers/createTestMcpServer'
import { createTestFunction } from '../../lib/functions/createTestFunction'
import { startFakeMcpServer } from '../../lib/mcpServers/startFakeMcpServer'
import { startFakeLlm } from '../../lib/llm/startFakeLlm'
import {
  startFakeOpenaiResponses,
  type FakeResponseOutputItem,
} from '../../lib/llm/startFakeOpenaiResponses'
import { postMessage } from '../../lib/messages/postMessage'

describe('tool calls from the OpenAI Responses API', { timeout: 30000 }, () => {
  let openai: Awaited<ReturnType<typeof startFakeOpenaiResponses>> | null = null
  let replies: FakeResponseOutputItem[][] = []

  const useReplies = async (next: FakeResponseOutputItem[][]) => {
    replies = next
    openai = await startFakeOpenaiResponses({ replies })
    process.env.OPENAI_BASE_URL = openai.baseURL
    return openai
  }

  afterEach(async () => {
    await openai?.close()
    openai = null
  })

  const createResponsesAssistant = async ({
    modelSlug,
  }: {
    modelSlug: string
  }) => {
    const workspace = await createTestWorkspace()
    const modelProvider = await createTestModelProvider({
      data: { workspaceId: workspace.id, type: ModelProviderType.OPENAI },
    })
    const assistant = await createTestAssistant({
      data: {
        workspaceId: workspace.id,
        modelProviderId: modelProvider.id,
        storageProviderType: StorageProviderType.OPENAI_RESPONSES,
        modelSlug,
      },
    })
    const publicKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
    })
    return { assistant, publicKey }
  }

  describe('computer calls', () => {
    let computer: Awaited<ReturnType<typeof startFakeMcpServer>>

    before(async () => {
      computer = await startFakeMcpServer({
        tools: [
          {
            name: 'computer_call',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
        callTool: () => ({
          content: [{ type: 'image', data: 'WFla', mimeType: 'image/png' }],
        }),
      })
    })

    after(async () => {
      await computer.close()
    })

    it('runs every action of a batched computer call', async () => {
      const fake = await useReplies([
        [
          {
            type: 'computer_call',
            call_id: 'call_computer',
            actions: [
              { type: 'click', x: 1, y: 2 },
              { type: 'type', text: 'hello' },
            ],
            pending_safety_checks: [
              { id: 'sc_1', code: 'malicious_instructions', message: 'm' },
            ],
          },
        ],
        [{ type: 'message', text: 'Typed it.' }],
      ])
      const { assistant, publicKey } = await createResponsesAssistant({
        modelSlug: 'gpt-5.4',
      })
      const mcpServer = await createTestMcpServer({
        assistantId: assistant.id,
        transportType: TransportType.HTTP,
        url: computer.httpUrl,
      })
      await createTestComputerUseTool({
        assistantId: assistant.id,
        mcpServerId: mcpServer.id,
      })

      const result = await postMessage({
        body: {
          assistantId: assistant.id,
          publicApiKey: publicKey.value,
          content: 'Type hello.',
        },
      })

      assert.strictEqual(result.status, 200)
      assert.deepStrictEqual(
        computer.toolCalls.map(({ arguments: args }) => args),
        [
          { action: { type: 'click', x: 1, y: 2 } },
          { action: { type: 'type', text: 'hello' } },
        ],
      )

      const [, followUp] = fake.responseRequests()
      const output = followUp.body.input.find(
        ({ type }: { type: string }) => type === 'computer_call_output',
      )
      assert.strictEqual(output.call_id, 'call_computer')
      assert.deepStrictEqual(output.acknowledged_safety_checks, [
        { id: 'sc_1' },
      ])
      assert.strictEqual(output.output.image_url, 'data:image/png;base64,WFla')
    })
  })

  it('drops child output for runs that are not database runs', async () => {
    const childLlm = await startFakeLlm({
      replies: [{ content: 'Child answer.' }],
    })

    try {
      const fake = await useReplies([
        [
          {
            type: 'function_call',
            call_id: 'call_child',
            name: 'ask_child',
            arguments: JSON.stringify({ message: 'Hello child' }),
          },
        ],
        [{ type: 'message', text: 'Parent done.' }],
      ])
      const { assistant, publicKey } = await createResponsesAssistant({
        modelSlug: 'gpt-4o-mini',
      })
      const { assistant: child } = await createFakeLlmAssistant({
        baseURL: childLlm.baseURL,
        workspaceId: assistant.workspaceId,
      })
      await createTestFunction({
        assistantId: assistant.id,
        openapiSpec: { name: 'ask_child', parameters: {} },
        handler: {
          type: HandlerType.ASSISTANT,
          assistantHandler: { create: { assistantId: child.id } },
        },
      })

      const result = await postMessage({
        body: {
          assistantId: assistant.id,
          publicApiKey: publicKey.value,
          content: 'Ask the child.',
        },
      })

      assert.strictEqual(result.status, 200)
      const [, followUp] = fake.responseRequests()
      const output = followUp.body.input.find(
        ({ type }: { type: string }) => type === 'function_call_output',
      )
      // BUG (documented, not fixed here): streamOutput returns before reading
      // the child stream when the parent run id is not a UUID, so
      // handleAssistant collects no child messages (the child stream is never
      // consumed) and the parent model gets an empty output instead of the
      // child's answer.
      assert.deepStrictEqual(
        { call_id: output.call_id, output: output.output },
        { call_id: 'call_child', output: '' },
      )
      // Response ids are not database runs, so child deltas are not streamed.
      assert.strictEqual(
        result.events.some(
          ({ event, data }) =>
            event === 'thread.run.step.delta' &&
            data.delta?.step_details?.tool_calls?.some(
              ({ id }: { id: string }) => id === 'call_child',
            ),
        ),
        false,
      )
    } finally {
      await childLlm.close()
    }
  })
})
