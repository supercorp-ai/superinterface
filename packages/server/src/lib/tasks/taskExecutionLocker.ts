import { randomUUID } from 'node:crypto'

import { redis } from '@/lib/redis'

export const TASK_EXECUTION_LOCK_TTL_SECONDS = 15 * 60

const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`

type RedisLockClient = {
  set: (
    key: string,
    value: string,
    options: { nx: true; ex: number },
  ) => Promise<'OK' | null>
  eval: (script: string, keys: string[], args: string[]) => Promise<unknown>
}

export type TaskExecutionLease = {
  release: () => Promise<void>
}

export type TaskExecutionLocker = {
  acquire: ({
    taskId,
    ttlSeconds,
  }: {
    taskId: string
    ttlSeconds: number
  }) => Promise<TaskExecutionLease | null>
}

export const getTaskExecutionLockKey = ({ taskId }: { taskId: string }) =>
  `task-execution-lock:${taskId}`

export const createRedisTaskExecutionLocker = ({
  client,
}: {
  client: RedisLockClient
}): TaskExecutionLocker => ({
  acquire: async ({ taskId, ttlSeconds }) => {
    const key = getTaskExecutionLockKey({ taskId })
    const token = randomUUID()
    const result = await client.set(key, token, { nx: true, ex: ttlSeconds })

    if (result !== 'OK') return null

    let released = false

    return {
      release: async () => {
        if (released) return
        released = true

        await client.eval(RELEASE_LOCK_SCRIPT, [key], [token])
      },
    }
  },
})

export const createInMemoryTaskExecutionLocker = (): TaskExecutionLocker => {
  const locks = new Map<string, { token: string; expiresAt: number }>()

  return {
    acquire: async ({ taskId, ttlSeconds }) => {
      const key = getTaskExecutionLockKey({ taskId })
      const now = Date.now()
      const existing = locks.get(key)

      if (existing && existing.expiresAt > now) return null

      const token = randomUUID()
      locks.set(key, { token, expiresAt: now + ttlSeconds * 1000 })

      let released = false

      return {
        release: async () => {
          if (released) return
          released = true

          if (locks.get(key)?.token === token) {
            locks.delete(key)
          }
        },
      }
    },
  }
}

const redisTaskExecutionLocker = createRedisTaskExecutionLocker({
  client: redis as unknown as RedisLockClient,
})
const inMemoryTaskExecutionLocker = createInMemoryTaskExecutionLocker()

export const defaultTaskExecutionLocker: TaskExecutionLocker = {
  acquire: (options) =>
    process.env.NODE_ENV === 'test'
      ? inMemoryTaskExecutionLocker.acquire(options)
      : redisTaskExecutionLocker.acquire(options),
}
