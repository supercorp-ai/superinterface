import { testApiHandler } from 'next-test-api-route-handler'
import assert from 'node:assert'
import { after, before, describe, it } from 'node:test'
import {
  ApiKeyType,
  ModelProviderType,
  StorageProviderType,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTestWorkspace } from '../../lib/workspaces/createTestWorkspace'
import { createTestModelProvider } from '../../lib/modelProviders/createTestModelProvider'
import { createTestAssistant } from '../../lib/assistants/createTestAssistant'
import { createTestApiKey } from '../../lib/apiKeys/createTestApiKey'
import { startFakeLlm } from '../../lib/llm/startFakeLlm'
import { readMessageEvents } from '../../lib/messages/readMessageEvents'

describe('/api/messages with a fake LLM', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>

  before(async () => {
    fakeLlm = await startFakeLlm({
      replies: [{ content: 'Hello from the fake model.' }],
    })
  })

  after(async () => {
    await fakeLlm.close()
  })

  it('streams a completed run and persists the conversation', async () => {
    const workspace = await createTestWorkspace()
    const modelProvider = await createTestModelProvider({
      data: {
        workspaceId: workspace.id,
        type: ModelProviderType.OLLAMA,
        endpoint: fakeLlm.baseURL,
      },
    })
    const assistant = await createTestAssistant({
      data: {
        workspaceId: workspace.id,
        modelProviderId: modelProvider.id,
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        modelSlug: 'fake-model',
        instructions: 'Be brief.',
      },
    })
    const publicKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
    })

    const appHandler = await import('../../../src/app/api/messages/route')

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assistantId: assistant.id,
            publicApiKey: publicKey.value,
            content: 'Hi there',
          }),
        })

        assert.strictEqual(response.status, 200)
        const events = await readMessageEvents({ response })
        const eventNames = events.map(({ event }) => event)

        assert.ok(eventNames.includes('thread.created'))
        assert.ok(eventNames.includes('thread.run.created'))

        const completedMessage = events.find(
          ({ event }) => event === 'thread.message.completed',
        )
        assert.strictEqual(
          completedMessage?.data.content[0].text.value,
          'Hello from the fake model.',
        )

        const [completionRequest] = fakeLlm.completionRequests()
        assert.strictEqual(completionRequest.body.model, 'fake-model')
        assert.deepStrictEqual(
          completionRequest.body.messages.map(
            ({ role }: { role: string }) => role,
          ),
          ['system', 'user'],
        )
      },
    })

    const thread = await prisma.thread.findFirstOrThrow({
      where: { assistantId: assistant.id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        runs: true,
      },
    })
    assert.deepStrictEqual(
      thread.messages.map(({ role }) => role),
      ['USER', 'ASSISTANT'],
    )
    assert.deepStrictEqual(
      thread.runs.map(({ status }) => status),
      ['COMPLETED'],
    )
  })
})
