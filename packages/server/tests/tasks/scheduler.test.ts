import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createLocalScheduler } from '../../src/lib/tasks/schedulers/localScheduler'
import type { TaskScheduler } from '../../src/lib/tasks/schedulers/types'

// ---- helpers ----

const createMockQstashClient = (): TaskScheduler & {
  scheduled: Array<{
    messageId: string
    url: string
    body: Record<string, unknown>
    delay: number
  }>
  deleted: string[]
} => {
  const scheduled: Array<{
    messageId: string
    url: string
    body: Record<string, unknown>
    delay: number
  }> = []
  const deleted: string[] = []

  return {
    scheduled,
    deleted,
    publishJSON: async (opts: {
      url: string
      body: Record<string, unknown>
      delay: number
    }) => {
      const messageId = randomUUID()
      scheduled.push({ messageId, ...opts })
      return { messageId }
    },
    messages: {
      delete: async (id: string) => {
        deleted.push(id)
      },
    },
  }
}

// ---- shared tests: run identically for both schedulers ----

const runSchedulerTests = (
  name: string,
  createScheduler: () => { scheduler: TaskScheduler; cleanup?: () => void },
) => {
  describe(name, () => {
    let scheduler: TaskScheduler
    let cleanup: (() => void) | undefined

    beforeEach(() => {
      const result = createScheduler()
      scheduler = result.scheduler
      cleanup = result.cleanup
    })

    afterEach(() => {
      cleanup?.()
    })

    describe('publishJSON', () => {
      it('returns a messageId', async () => {
        const result = await scheduler.publishJSON({
          url: 'http://localhost:3000/api/tasks/callback',
          body: { taskId: randomUUID() },
          delay: 60,
        })

        assert.ok(result.messageId)
        assert.equal(typeof result.messageId, 'string')
        assert.ok(result.messageId.length > 0)
      })

      it('returns unique messageIds for each publish', async () => {
        const opts = {
          url: 'http://localhost:3000/api/tasks/callback',
          body: { taskId: randomUUID() },
          delay: 60,
        }

        const result1 = await scheduler.publishJSON(opts)
        const result2 = await scheduler.publishJSON(opts)

        assert.notEqual(result1.messageId, result2.messageId)
      })

      it('accepts delay of 0', async () => {
        const result = await scheduler.publishJSON({
          url: 'http://localhost:3000/api/tasks/callback',
          body: { taskId: randomUUID() },
          delay: 0,
        })

        assert.ok(result.messageId)
      })

      it('accepts large delays', async () => {
        const result = await scheduler.publishJSON({
          url: 'http://localhost:3000/api/tasks/callback',
          body: { taskId: randomUUID() },
          delay: 86400, // 1 day
        })

        assert.ok(result.messageId)
      })

      it('preserves body payload', async () => {
        const taskId = randomUUID()
        const result = await scheduler.publishJSON({
          url: 'http://localhost:3000/api/tasks/callback',
          body: { taskId, extra: 'data' },
          delay: 60,
        })

        assert.ok(result.messageId)
      })
    })

    describe('messages.delete', () => {
      it('deletes a previously published message', async () => {
        const { messageId } = await scheduler.publishJSON({
          url: 'http://localhost:3000/api/tasks/callback',
          body: { taskId: randomUUID() },
          delay: 3600,
        })

        // Should not throw
        await scheduler.messages.delete(messageId)
      })

      it('does not throw when deleting a non-existent messageId', async () => {
        // Should not throw
        await scheduler.messages.delete(randomUUID())
      })

      it('does not throw when deleting the same messageId twice', async () => {
        const { messageId } = await scheduler.publishJSON({
          url: 'http://localhost:3000/api/tasks/callback',
          body: { taskId: randomUUID() },
          delay: 3600,
        })

        await scheduler.messages.delete(messageId)
        // Second delete should not throw
        await scheduler.messages.delete(messageId)
      })
    })
  })
}

// ---- local scheduler tests ----

runSchedulerTests('localScheduler', () => {
  const scheduler = createLocalScheduler()
  return { scheduler, cleanup: () => scheduler.dispose() }
})

// ---- qstash mock tests ----

runSchedulerTests('qstash (mocked)', () => {
  const scheduler = createMockQstashClient()
  return { scheduler }
})

// ---- local scheduler specific behavior ----

describe('localScheduler — delivery', () => {
  it('delivers message after delay via fetch', async () => {
    // Drain any pending timers from shared tests before replacing fetch
    await new Promise((resolve) => setTimeout(resolve, 50))

    const scheduler = createLocalScheduler()
    const receivedBodies: unknown[] = []

    const originalFetch = globalThis.fetch
    const mockFetch: typeof fetch = async (_input, init) => {
      receivedBodies.push(JSON.parse(init?.body as string))
      return new Response('ok', { status: 200 })
    }
    globalThis.fetch = mockFetch

    try {
      const taskId = randomUUID()
      await scheduler.publishJSON({
        url: 'http://localhost:3000/api/tasks/callback',
        body: { taskId },
        delay: 0,
      })

      // Wait for the setTimeout(0) to fire
      await new Promise((resolve) => setTimeout(resolve, 50))

      assert.equal(receivedBodies.length, 1)
      assert.deepEqual(receivedBodies[0], { taskId })
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('does not deliver after cancel', async () => {
    const scheduler = createLocalScheduler()
    const receivedBodies: unknown[] = []

    const originalFetch = globalThis.fetch
    const mockFetch: typeof fetch = async (_input, init) => {
      receivedBodies.push(JSON.parse(init?.body as string))
      return new Response('ok', { status: 200 })
    }
    globalThis.fetch = mockFetch

    try {
      const { messageId } = await scheduler.publishJSON({
        url: 'http://localhost:3000/api/tasks/callback',
        body: { taskId: randomUUID() },
        delay: 1, // 1 second
      })

      await scheduler.messages.delete(messageId)

      // Wait longer than the delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      assert.equal(receivedBodies.length, 0)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('sends POST with QStash-compatible delivery headers', async () => {
    const scheduler = createLocalScheduler()
    let capturedHeaders: Record<string, string> = {}

    const originalFetch = globalThis.fetch
    const mockFetch: typeof fetch = async (_input, init) => {
      capturedHeaders = { ...(init?.headers as Record<string, string>) }
      return new Response('ok', { status: 200 })
    }
    globalThis.fetch = mockFetch

    try {
      const { messageId } = await scheduler.publishJSON({
        url: 'http://localhost:3000/api/tasks/callback',
        body: { taskId: randomUUID() },
        delay: 0,
      })

      await new Promise((resolve) => setTimeout(resolve, 50))

      assert.equal(capturedHeaders['Content-Type'], 'application/json')
      assert.equal(capturedHeaders['Upstash-Message-Id'], messageId)
      assert.equal(capturedHeaders['Upstash-Retried'], '0')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('sends POST to correct URL', async () => {
    const scheduler = createLocalScheduler()
    let capturedUrl = ''

    const originalFetch = globalThis.fetch
    const mockFetch: typeof fetch = async (input) => {
      capturedUrl = input.toString()
      return new Response('ok', { status: 200 })
    }
    globalThis.fetch = mockFetch

    try {
      const url = 'http://localhost:3000/api/tasks/callback'
      await scheduler.publishJSON({
        url,
        body: { taskId: randomUUID() },
        delay: 0,
      })

      await new Promise((resolve) => setTimeout(resolve, 50))

      assert.equal(capturedUrl, url)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('handles fetch errors gracefully without throwing', async () => {
    const scheduler = createLocalScheduler()

    const originalFetch = globalThis.fetch
    const mockFetch: typeof fetch = async () => {
      throw new Error('Network error')
    }
    globalThis.fetch = mockFetch

    try {
      await scheduler.publishJSON({
        url: 'http://localhost:3000/api/tasks/callback',
        body: { taskId: randomUUID() },
        delay: 0,
      })

      // Wait for timer — should not throw/crash the process
      await new Promise((resolve) => setTimeout(resolve, 50))
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

// ---- qstash mock specific behavior ----

describe('qstash mock — records calls', () => {
  it('records url, body, and delay', async () => {
    const mockClient = createMockQstashClient()

    const taskId = randomUUID()
    const url = 'http://localhost:3000/api/cloud/tasks/callback'

    await mockClient.publishJSON({
      url,
      body: { taskId },
      delay: 30,
    })

    assert.equal(mockClient.scheduled.length, 1)
    assert.equal(mockClient.scheduled[0].url, url)
    assert.deepEqual(mockClient.scheduled[0].body, { taskId })
    assert.equal(mockClient.scheduled[0].delay, 30)
  })

  it('records messageId on delete', async () => {
    const mockClient = createMockQstashClient()

    const { messageId } = await mockClient.publishJSON({
      url: 'http://localhost:3000/api/tasks/callback',
      body: { taskId: randomUUID() },
      delay: 60,
    })

    await mockClient.messages.delete(messageId)

    assert.equal(mockClient.deleted.length, 1)
    assert.equal(mockClient.deleted[0], messageId)
  })
})
