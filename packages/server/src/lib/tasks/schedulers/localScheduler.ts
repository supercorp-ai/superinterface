import { randomUUID } from 'node:crypto'
import type { TaskScheduler } from './types'

export const createLocalScheduler = (): TaskScheduler & {
  dispose: () => void
} => {
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  return {
    publishJSON: async ({ url, body, delay }) => {
      const messageId = randomUUID()

      const timer = setTimeout(async () => {
        timers.delete(messageId)
        try {
          await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Upstash-Message-Id': messageId,
              'Upstash-Retried': '0',
            },
            body: JSON.stringify(body),
          })
        } catch (error) {
          console.error(`Local scheduler: failed to deliver to ${url}:`, error)
        }
      }, delay * 1000)

      timers.set(messageId, timer)

      return { messageId }
    },
    messages: {
      delete: async (messageId) => {
        const timer = timers.get(messageId)
        if (timer) {
          clearTimeout(timer)
          timers.delete(messageId)
        }
      },
    },
    dispose: () => {
      for (const timer of timers.values()) {
        clearTimeout(timer)
      }
      timers.clear()
    },
  }
}
