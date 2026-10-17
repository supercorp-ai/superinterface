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
import { redirectExternalFetch } from '../../lib/providerApi/redirectExternalFetch'

// Perplexity has a hardcoded base URL, so its traffic is redirected to a
// local fake LLM to run a conversation end to end.
describe('/api/messages with a Perplexity model provider', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>
  let restoreFetch: () => void

  before(async () => {
    fakeLlm = await startFakeLlm({
      replies: [{ content: 'Hello from fake Perplexity.' }],
    })
    restoreFetch = redirectExternalFetch({
      origin: new URL(fakeLlm.baseURL).origin,
    })
  })

  after(async () => {
    restoreFetch()
    await fakeLlm.close()
  })

  it('streams a completed run through the Perplexity API', async () => {
    const workspace = await createTestWorkspace()
    const modelProvider = await createTestModelProvider({
      data: {
        workspaceId: workspace.id,
        type: ModelProviderType.PERPLEXITY,
        apiKey: 'pplx-key',
      },
    })
    const assistant = await createTestAssistant({
      data: {
        workspaceId: workspace.id,
        modelProviderId: modelProvider.id,
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        modelSlug: 'sonar',
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
        const completedMessage = events.find(
          ({ event }) => event === 'thread.message.completed',
        )
        assert.strictEqual(
          completedMessage?.data.content[0].text.value,
          'Hello from fake Perplexity.',
        )
      },
    })

    const [completionRequest] = fakeLlm.completionRequests()
    assert.strictEqual(
      completionRequest.path,
      '/api.perplexity.ai/chat/completions',
    )
    assert.strictEqual(completionRequest.body.model, 'sonar')

    const thread = await prisma.thread.findFirstOrThrow({
      where: { assistantId: assistant.id },
      include: { runs: true },
    })
    assert.deepStrictEqual(
      thread.runs.map(({ status }) => status),
      ['COMPLETED'],
    )
  })
})
