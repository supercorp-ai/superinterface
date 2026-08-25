import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  createInMemoryTaskExecutionLocker,
  createRedisTaskExecutionLocker,
  getTaskExecutionLockKey,
} from '../../src/lib/tasks/taskExecutionLocker'

describe('taskExecutionLocker', () => {
  describe('Redis locker', () => {
    it('acquires a task-scoped lock with NX and the requested TTL', async () => {
      const setCalls: unknown[][] = []
      const client = {
        set: async (...args: unknown[]) => {
          setCalls.push(args)
          return 'OK' as const
        },
        eval: async () => 1,
      }
      const locker = createRedisTaskExecutionLocker({ client })

      const lease = await locker.acquire({ taskId: 'task-1', ttlSeconds: 900 })

      assert.ok(lease)
      assert.equal(setCalls.length, 1)
      assert.equal(
        setCalls[0][0],
        getTaskExecutionLockKey({ taskId: 'task-1' }),
      )
      assert.equal(typeof setCalls[0][1], 'string')
      assert.deepEqual(setCalls[0][2], { nx: true, ex: 900 })
    })

    it('returns null when another execution owns the lock', async () => {
      let evalCalls = 0
      const locker = createRedisTaskExecutionLocker({
        client: {
          set: async () => null,
          eval: async () => {
            evalCalls += 1
            return 0
          },
        },
      })

      const lease = await locker.acquire({ taskId: 'task-1', ttlSeconds: 900 })

      assert.equal(lease, null)
      assert.equal(evalCalls, 0)
    })

    it('releases only with the token generated for that lease', async () => {
      let acquiredToken = ''
      const evalCalls: Array<{
        script: string
        keys: string[]
        args: string[]
      }> = []
      const locker = createRedisTaskExecutionLocker({
        client: {
          set: async (_key, value) => {
            acquiredToken = value
            return 'OK' as const
          },
          eval: async (script, keys, args) => {
            evalCalls.push({ script, keys, args })
            return 1
          },
        },
      })
      const lease = await locker.acquire({ taskId: 'task-7', ttlSeconds: 900 })

      await lease?.release()

      assert.equal(evalCalls.length, 1)
      assert.deepEqual(evalCalls[0].keys, [
        getTaskExecutionLockKey({ taskId: 'task-7' }),
      ])
      assert.deepEqual(evalCalls[0].args, [acquiredToken])
      assert.match(evalCalls[0].script, /redis\.call\("get"/)
      assert.match(evalCalls[0].script, /redis\.call\("del"/)
    })

    it('makes lease release idempotent', async () => {
      let evalCalls = 0
      const locker = createRedisTaskExecutionLocker({
        client: {
          set: async () => 'OK' as const,
          eval: async () => {
            evalCalls += 1
            return 1
          },
        },
      })
      const lease = await locker.acquire({ taskId: 'task-1', ttlSeconds: 900 })

      await lease?.release()
      await lease?.release()

      assert.equal(evalCalls, 1)
    })
  })

  describe('in-memory locker', () => {
    it('prevents overlapping executions for the same task', async () => {
      const locker = createInMemoryTaskExecutionLocker()
      const first = await locker.acquire({ taskId: 'task-1', ttlSeconds: 900 })
      const second = await locker.acquire({ taskId: 'task-1', ttlSeconds: 900 })

      assert.ok(first)
      assert.equal(second, null)
    })

    it('allows different tasks to execute concurrently', async () => {
      const locker = createInMemoryTaskExecutionLocker()

      const first = await locker.acquire({ taskId: 'task-1', ttlSeconds: 900 })
      const second = await locker.acquire({ taskId: 'task-2', ttlSeconds: 900 })

      assert.ok(first)
      assert.ok(second)
    })

    it('allows the task to execute again after release', async () => {
      const locker = createInMemoryTaskExecutionLocker()
      const first = await locker.acquire({ taskId: 'task-1', ttlSeconds: 900 })

      await first?.release()

      const second = await locker.acquire({ taskId: 'task-1', ttlSeconds: 900 })
      assert.ok(second)
    })

    it('allows a new lease after the previous lease expires', async () => {
      const originalNow = Date.now
      let now = 1_000_000
      Date.now = () => now

      try {
        const locker = createInMemoryTaskExecutionLocker()
        const first = await locker.acquire({ taskId: 'task-1', ttlSeconds: 10 })
        now += 10_001
        const second = await locker.acquire({
          taskId: 'task-1',
          ttlSeconds: 10,
        })

        assert.ok(first)
        assert.ok(second)
      } finally {
        Date.now = originalNow
      }
    })

    it('does not let an expired lease release its replacement lease', async () => {
      const originalNow = Date.now
      let now = 1_000_000
      Date.now = () => now

      try {
        const locker = createInMemoryTaskExecutionLocker()
        const expired = await locker.acquire({
          taskId: 'task-1',
          ttlSeconds: 10,
        })
        now += 10_001
        const replacement = await locker.acquire({
          taskId: 'task-1',
          ttlSeconds: 10,
        })

        await expired?.release()

        const overlapping = await locker.acquire({
          taskId: 'task-1',
          ttlSeconds: 10,
        })
        assert.ok(replacement)
        assert.equal(overlapping, null)

        await replacement?.release()
        assert.ok(await locker.acquire({ taskId: 'task-1', ttlSeconds: 10 }))
      } finally {
        Date.now = originalNow
      }
    })
  })
})
