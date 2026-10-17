import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { prisma } from '@/lib/prisma'
import { createTaskTestContext } from '../../lib/tasks/createTaskTestContext'
import { createTestTask } from '../../lib/tasks/createTestTask'
import { callRoute } from '../../lib/http/callRoute'
import { startFakeQstash } from '../../lib/qstash/startFakeQstash'
import { signQstashRequest } from '../../lib/qstash/signQstashRequest'
import { startFakeRedisWithLocks } from '../../lib/redis/startFakeRedisWithLocks'
import { startFakeLlm } from '../../lib/llm/startFakeLlm'

// Outside tests the callback only accepts QStash-signed deliveries and guards
// execution with a Redis lock. This file runs the route the way production
// does (NODE_ENV=production with signing keys) against local QStash, Redis and
// LLM fakes.

const CURRENT_SIGNING_KEY = 'sig_current_test_key'
const NEXT_SIGNING_KEY = 'sig_next_test_key'

const fakeQstash = await startFakeQstash()
const fakeRedis = await startFakeRedisWithLocks()
const fakeLlm = await startFakeLlm({
  respond: () => ({ content: 'Scheduled reply.' }),
})

process.env.QSTASH_URL = fakeQstash.baseURL
process.env.QSTASH_TOKEN = 'test-qstash-token'
process.env.QSTASH_CURRENT_SIGNING_KEY = CURRENT_SIGNING_KEY
process.env.QSTASH_NEXT_SIGNING_KEY = NEXT_SIGNING_KEY
process.env.UPSTASH_REDIS_REST_URL = fakeRedis.baseURL
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-redis-token'
process.env.NEXT_PUBLIC_SUPERINTERFACE_BASE_URL = 'https://superinterface.test'

// The Prisma client above was already created in test mode; only the callback
// route and the task lock observe the production environment.
const setNodeEnv = (value: string) => {
  ;(process.env as Record<string, string>).NODE_ENV = value
}
setNodeEnv('production')

const callbackRoute = await import('../../../src/app/api/tasks/callback/route')
const { buildPOST } = await import(
  '../../../src/app/api/tasks/callback/buildRoute'
)

after(async () => {
  setNodeEnv('test')
  await Promise.all([fakeQstash.close(), fakeRedis.close(), fakeLlm.close()])
})

const createDueTask = async () => {
  const { thread } = await createTaskTestContext({ endpoint: fakeLlm.baseURL })
  return createTestTask({
    data: {
      threadId: thread.id,
      message: 'Production check-in',
      schedule: {
        start: new Date(Date.now() - 60 * 1000).toISOString(),
        recurrenceRules: [{ frequency: 'hourly' }],
      },
      qstashMessageId: 'msg_prod',
    },
  })
}

const deliver = ({
  taskId,
  signingKey,
}: {
  taskId: string
  signingKey?: string
}) => {
  const rawBody = JSON.stringify({ taskId })
  const headers: Record<string, string> = { 'Upstash-Message-Id': 'msg_prod' }
  if (signingKey) {
    headers['Upstash-Signature'] = signQstashRequest({
      body: rawBody,
      signingKey,
    })
  }

  return callRoute({
    appHandler: callbackRoute,
    method: 'POST',
    headers,
    rawBody,
  })
}

describe('task callback in production', () => {
  it('rejects deliveries that are not signed by QStash', async () => {
    const task = await createDueTask()
    const before = fakeLlm.completionRequests().length

    const response = await deliver({ taskId: task.id })

    assert.equal(response.status, 403)
    assert.equal(response.json, '`Upstash-Signature` header is missing')
    assert.equal(fakeLlm.completionRequests().length, before)
  })

  it('runs a signed delivery under a Redis lock and releases it afterwards', async () => {
    const task = await createDueTask()
    fakeRedis.commands.length = 0

    const response = await deliver({
      taskId: task.id,
      signingKey: CURRENT_SIGNING_KEY,
    })

    assert.equal(response.status, 200)
    assert.deepEqual(response.json, { ok: true })

    const lockKey = `task-execution-lock:${task.id}`
    const [lock] = fakeRedis.commands.filter(([name]) => name === 'set')
    assert.deepEqual(
      [lock[0], lock[1], ...lock.slice(3)],
      ['set', lockKey, 'nx', 'ex', 15 * 60],
    )
    const release = fakeRedis.commands.find(([name]) => name === 'eval')
    assert.deepEqual(release?.slice(2), [1, lockKey, lock[2]])
    assert.equal(fakeRedis.store.has(lockKey), false)

    const messages = await prisma.message.findMany({
      where: { threadId: task.threadId },
      orderBy: { createdAt: 'asc' },
    })
    assert.deepEqual(
      messages.map(({ role }) => role),
      ['USER', 'ASSISTANT'],
    )
    assert.ok(fakeQstash.publishes.some(({ body }) => body.taskId === task.id))
  })

  it('accepts deliveries signed with the next signing key', async () => {
    const task = await createDueTask()

    const response = await deliver({
      taskId: task.id,
      signingKey: NEXT_SIGNING_KEY,
    })

    assert.deepEqual(response.json, { ok: true })
  })

  it('asks QStash to retry while another execution holds the lock', async () => {
    const task = await createDueTask()
    const lockKey = `task-execution-lock:${task.id}`
    fakeRedis.store.set(lockKey, 'other-execution')
    const before = fakeLlm.completionRequests().length

    const response = await deliver({
      taskId: task.id,
      signingKey: CURRENT_SIGNING_KEY,
    })

    assert.equal(response.status, 503)
    assert.deepEqual(response.json, {
      error: 'Task execution already in progress',
    })
    assert.equal(response.headers.get('retry-after'), '30')
    assert.equal(fakeLlm.completionRequests().length, before)
    assert.equal(fakeRedis.store.get(lockKey), 'other-execution')
  })

  it('accepts unsigned deliveries when no signing key is configured', async () => {
    const task = await createDueTask()
    const signingKey = process.env.QSTASH_CURRENT_SIGNING_KEY
    delete process.env.QSTASH_CURRENT_SIGNING_KEY

    try {
      const unsignedRoute = { POST: buildPOST({ prisma }) }
      const rawBody = JSON.stringify({ taskId: task.id })

      const response = await callRoute({
        appHandler: unsignedRoute,
        method: 'POST',
        headers: { 'Upstash-Message-Id': 'msg_prod' },
        rawBody,
      })

      assert.deepEqual(response.json, { ok: true })
    } finally {
      process.env.QSTASH_CURRENT_SIGNING_KEY = signingKey
    }
  })
})
