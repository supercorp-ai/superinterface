import assert from 'node:assert'
import { after, before, describe, it, mock } from 'node:test'
import { testApiHandler } from 'next-test-api-route-handler'
import { HandlerType, StorageProviderType } from '@prisma/client'
import { startFakeLlm } from '../../lib/llm/startFakeLlm'
import { createFakeLlmAssistant } from '../../lib/assistants/createFakeLlmAssistant'
import { createTestAssistant } from '../../lib/assistants/createTestAssistant'
import { createTestFunction } from '../../lib/functions/createTestFunction'
import { prismaRejectingAssistantLookup } from '../../lib/prisma/prismaRejectingAssistantLookup'
import { waitForLog } from '../../lib/logs/waitForLog'

// buildPOST accepts the embedding app's own PrismaClient. When that client
// fails while a tool call is being handled mid-stream, the run is aborted and
// the failure is logged with whatever the client rejected with.
describe('POST /api/messages when the run stream breaks', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>

  before(async () => {
    fakeLlm = await startFakeLlm({
      respond: () => ({
        toolCalls: [{ name: 'ask_expert', arguments: { message: 'Hi' } }],
      }),
    })
  })

  after(async () => {
    await fakeLlm.close()
  })

  // Returns once the failure is logged. The route errors the response stream,
  // so the body never finishes and is cancelled instead of read to the end.
  const expectLoggedFailure = async ({
    error,
    message,
  }: {
    error: unknown
    message: string
  }) => {
    const { assistant, publicKey, workspace, modelProvider } =
      await createFakeLlmAssistant({ baseURL: fakeLlm.baseURL })
    const expert = await createTestAssistant({
      data: {
        workspaceId: workspace.id,
        modelProviderId: modelProvider.id,
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        modelSlug: 'fake-model',
      },
    })
    await createTestFunction({
      assistantId: assistant.id,
      openapiSpec: {
        name: 'ask_expert',
        parameters: {
          type: 'object',
          properties: { message: { type: 'string' } },
        },
      },
      handler: {
        type: HandlerType.ASSISTANT,
        assistantHandler: { create: { assistantId: expert.id } },
      },
    })

    const { buildPOST } = await import(
      '../../../src/app/api/messages/buildRoute'
    )
    const POST = buildPOST({
      prisma: prismaRejectingAssistantLookup({
        assistantId: expert.id,
        error,
      }),
    })

    const consoleDir = mock.method(console, 'dir', () => undefined)

    await testApiHandler({
      appHandler: { POST },
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assistantId: assistant.id,
            publicApiKey: publicKey.value,
            content: 'Ask the expert.',
          }),
        })
        assert.strictEqual(response.status, 200)

        const log = await waitForLog({ workspaceId: workspace.id, message })
        assert.strictEqual(log.assistantId, assistant.id)
        await response.body?.cancel()
      },
    }).finally(() => consoleDir.mock.restore())

    return {
      consoleDirCalls: consoleDir.mock.calls.map(({ arguments: args }) => args),
    }
  }

  it('logs a non-Error rejection as text', async () => {
    const { consoleDirCalls } = await expectLoggedFailure({
      error: 'Expert lookup refused',
      message: 'Thread Run failed: Expert lookup refused',
    })

    // The route dumps the stream error with console.dir before logging it.
    assert.deepStrictEqual(consoleDirCalls, [
      [{ error: 'Expert lookup refused' }, { depth: null }],
    ])
  })

  it('logs an Error together with its non-Error cause', async () => {
    const error = new Error('Expert lookup failed:', {
      cause: 'pool exhausted',
    })

    const { consoleDirCalls } = await expectLoggedFailure({
      error,
      message: 'Thread Run failed: Expert lookup failed: pool exhausted',
    })

    // The route dumps the stream error with console.dir before logging it.
    assert.strictEqual(consoleDirCalls.length, 1)
    const [[dumped, options]] = consoleDirCalls
    assert.strictEqual(dumped.error, error)
    assert.deepStrictEqual(options, { depth: null })
  })
})
