import assert from 'node:assert'
import { after, before, describe, it } from 'node:test'
import {
  HandlerType,
  ModelProviderType,
  StorageProviderType,
} from '@prisma/client'
import { createTestAssistant } from '../../lib/assistants/createTestAssistant'
import { createTestModelProvider } from '../../lib/modelProviders/createTestModelProvider'
import { createTestFunction } from '../../lib/functions/createTestFunction'
import { runFakeToolCalls } from '../../lib/functions/runFakeToolCalls'
import {
  fakeMessage,
  fakeRun,
  startFakeOpenai,
  type FakeOpenaiEvent,
} from '../../lib/openai/startFakeOpenai'

// A parent on Superinterface Cloud storage asks a child on OpenAI Assistants
// storage, whose run stream comes straight from the (fake) Assistants API.
describe('ASSISTANT function handler child streams', () => {
  let fakeOpenai: Awaited<ReturnType<typeof startFakeOpenai>>
  let childRunEvents: (args: {
    threadId: string
  }) => FakeOpenaiEvent[] = () => []

  before(async () => {
    fakeOpenai = await startFakeOpenai({
      handle: ({ request }) => {
        const segments = request.path.split('/').filter(Boolean)
        if (
          request.method !== 'POST' ||
          segments[2] !== 'runs' ||
          segments.length !== 3
        ) {
          return undefined
        }

        return {
          type: 'sse',
          events: childRunEvents({ threadId: segments[1] }),
        }
      },
    })
    process.env.OPENAI_BASE_URL = fakeOpenai.baseURL
  })

  after(async () => {
    await fakeOpenai.close()
  })

  const askOpenaiChild = () =>
    runFakeToolCalls({
      toolCalls: [{ name: 'ask_child', arguments: { message: 'Hi child' } }],
      setup: async ({ assistant }) => {
        const modelProvider = await createTestModelProvider({
          data: {
            workspaceId: assistant.workspaceId,
            type: ModelProviderType.OPENAI,
            apiKey: 'sk-test',
          },
        })
        const child = await createTestAssistant({
          data: {
            workspaceId: assistant.workspaceId,
            modelProviderId: modelProvider.id,
            storageProviderType: StorageProviderType.OPENAI,
            openaiAssistantId: 'asst_fake',
            modelSlug: 'gpt-4o-mini',
          },
        })
        await createTestFunction({
          assistantId: assistant.id,
          openapiSpec: { name: 'ask_child', parameters: {} },
          handler: {
            type: HandlerType.ASSISTANT,
            assistantHandler: { create: { assistantId: child.id } },
          },
        })
      },
    })

  // The parent's own tool call deltas carry no output; child output does.
  const childOutputDeltas = ({
    result,
  }: {
    result: Awaited<ReturnType<typeof askOpenaiChild>>
  }) => {
    const parentToolCallId = result.toolMessages[0].tool_call_id

    return result.events
      .filter(({ event }) => event === 'thread.run.step.delta')
      .flatMap(({ data }) => data.delta.step_details.tool_calls)
      .filter(({ id }: { id: string }) => id === parentToolCallId)
      .map(({ function: fn }) => fn.output)
      .filter((output: string | undefined) => output !== undefined)
  }

  it('streams only the text parts of child message deltas', async () => {
    childRunEvents = ({ threadId }) => {
      const run = fakeRun({ threadId })
      const message = fakeMessage({ threadId, text: 'Look.', runId: run.id })

      return [
        { event: 'thread.run.created', data: run },
        {
          event: 'thread.message.delta',
          data: {
            id: message.id,
            object: 'thread.message.delta',
            delta: {
              content: [
                {
                  index: 0,
                  type: 'image_file',
                  image_file: { file_id: 'file-1' },
                },
                { index: 1, type: 'text', text: { value: 'Look.' } },
              ],
            },
          },
        },
        { event: 'thread.message.completed', data: message },
        {
          event: 'thread.run.completed',
          data: { ...run, status: 'completed' },
        },
      ]
    }

    const result = await askOpenaiChild()

    assert.strictEqual(result.status, 200)
    assert.deepStrictEqual(childOutputDeltas({ result }), ['\n\nLook.'])
    assert.deepStrictEqual(result.toolOutputs, ['Look.'])
  })

  it('returns an empty output when the child run streams nothing', async () => {
    childRunEvents = () => []

    const result = await askOpenaiChild()

    assert.strictEqual(result.status, 200)
    assert.deepStrictEqual(childOutputDeltas({ result }), [])
    assert.deepStrictEqual(result.toolOutputs, [''])
  })
})
