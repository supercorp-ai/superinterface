import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import { testApiHandler } from 'next-test-api-route-handler'
import { createPublicAssistant } from '../../lib/assistants/createPublicAssistant'
import { startFakeRedis } from '../../lib/redis/startFakeRedis'

describe('POST /api/threads/runs/submit-client-tool-outputs', () => {
  let fakeRedis: Awaited<ReturnType<typeof startFakeRedis>>

  before(async () => {
    fakeRedis = await startFakeRedis()
    process.env.UPSTASH_REDIS_REST_URL = fakeRedis.url
    process.env.UPSTASH_REDIS_REST_TOKEN = fakeRedis.token
  })

  after(async () => {
    await fakeRedis.close()
  })

  const submit = async ({ body }: { body: Record<string, unknown> }) => {
    const appHandler = await import(
      '../../../src/app/api/threads/runs/submit-client-tool-outputs/route'
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: { status: number; json: any } | undefined

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        result = { status: response.status, json: await response.json() }
      },
    })

    return result!
  }

  it('validates the api key, assistant and tool outputs', async () => {
    const { assistant, publicApiKey } = await createPublicAssistant()
    const { assistant: otherAssistant } = await createPublicAssistant()

    const cases = [
      {
        body: { assistantId: assistant.id, toolOutputs: [] },
        error: 'Invalid api key',
      },
      {
        body: {
          assistantId: assistant.id,
          publicApiKey: randomUUID(),
          toolOutputs: [],
        },
        error: 'Invalid api key',
      },
      {
        body: { publicApiKey, toolOutputs: [] },
        error: 'No assistant id found',
      },
      {
        body: { assistantId: otherAssistant.id, publicApiKey, toolOutputs: [] },
        error: 'No assistant found',
      },
      {
        body: { assistantId: assistant.id, publicApiKey, toolOutputs: {} },
        error: 'Invalid tool outputs',
      },
    ]

    for (const { body, error } of cases) {
      const { status, json } = await submit({ body })

      assert.strictEqual(status, 400)
      assert.deepStrictEqual(json, { error })
    }

    assert.deepStrictEqual(fakeRedis.commands, [])
  })

  it('stores outputs only for tool calls that are still pending', async () => {
    const { assistant, publicApiKey } = await createPublicAssistant()
    fakeRedis.store.set('submit-client-tool-outputs:pending:call_pending', '1')

    const { status, json } = await submit({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        toolOutputs: [
          { toolCallId: 'call_pending', output: { temperature: 21 } },
          { toolCallId: 'call_unknown', output: 'ignored' },
        ],
      },
    })

    assert.strictEqual(status, 200)
    assert.deepStrictEqual(json, { status: 'success' })
    assert.strictEqual(
      fakeRedis.store.get('submit-client-tool-outputs:output:call_pending'),
      JSON.stringify({ temperature: 21 }),
    )
    assert.ok(
      !fakeRedis.store.has('submit-client-tool-outputs:output:call_unknown'),
    )
    const setCommand = fakeRedis.commands.find(
      ([name]) => String(name).toLowerCase() === 'set',
    )
    assert.deepStrictEqual(setCommand?.slice(3), ['ex', 604800])
  })
})
