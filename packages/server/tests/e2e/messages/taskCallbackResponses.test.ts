import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { ModelProviderType, StorageProviderType } from '@prisma/client'
import { createTaskTestContext } from '../../lib/tasks/createTaskTestContext'
import { createTestTask } from '../../lib/tasks/createTestTask'
import { callRoute } from '../../lib/http/callRoute'
import { startFakeQstash } from '../../lib/qstash/startFakeQstash'
import { startFakeRedisWithLocks } from '../../lib/redis/startFakeRedisWithLocks'
import { startFakeOpenaiResponses } from '../../lib/llm/startFakeOpenaiResponses'

// A due task on a Responses-storage thread posts the task message into the
// thread's existing OpenAI conversation and starts a response there.
const fakeQstash = await startFakeQstash()
const fakeRedis = await startFakeRedisWithLocks()
const fakeOpenai = await startFakeOpenaiResponses({
  replies: [[{ type: 'message', text: 'Here is your summary.' }]],
})

process.env.QSTASH_URL = fakeQstash.baseURL
process.env.QSTASH_TOKEN = 'test-qstash-token'
process.env.UPSTASH_REDIS_REST_URL = fakeRedis.baseURL
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-redis-token'
process.env.OPENAI_BASE_URL = fakeOpenai.baseURL
process.env.NEXT_PUBLIC_SUPERINTERFACE_BASE_URL = 'https://superinterface.test'

const callbackRoute = await import('../../../src/app/api/tasks/callback/route')

after(async () => {
  await Promise.all([fakeQstash.close(), fakeRedis.close(), fakeOpenai.close()])
})

describe('task callback on OpenAI Responses storage', () => {
  it('runs the task in the thread conversation', async () => {
    const { thread } = await createTaskTestContext({
      modelProviderType: ModelProviderType.OPENAI,
      storageProviderType: StorageProviderType.OPENAI_RESPONSES,
      assistantData: { modelSlug: 'gpt-fake', instructions: '' },
      threadData: { openaiConversationId: 'conv_task' },
    })
    const task = await createTestTask({
      data: {
        threadId: thread.id,
        message: 'Send the daily summary',
        schedule: { start: new Date(Date.now() - 60_000).toISOString() },
      },
    })

    const response = await callRoute({
      appHandler: callbackRoute,
      method: 'POST',
      body: { taskId: task.id },
    })

    assert.equal(response.status, 200)
    assert.deepEqual(response.json, { ok: true })

    const responseRequests = fakeOpenai.requests.filter(
      ({ method, path }) => method === 'POST' && path === '/v1/responses',
    )
    assert.equal(responseRequests.length, 1)
    assert.equal(responseRequests[0].body.conversation, 'conv_task')
    assert.equal(responseRequests[0].body.model, 'gpt-fake')
    assert.deepEqual(responseRequests[0].body.input, [
      {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'Send the daily summary' }],
      },
    ])
  })
})
