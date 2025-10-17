import { testApiHandler } from 'next-test-api-route-handler'
import { beforeEach, describe, it, mock } from 'node:test'
import type { MockModuleOptions } from 'node:test'
import assert from 'node:assert'
import { ApiKeyType, StorageProviderType } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { createTestWorkspace } from '../lib/workspaces/createTestWorkspace'
import { createTestModelProvider } from '../lib/modelProviders/createTestModelProvider'
import { createTestAssistant } from '../lib/assistants/createTestAssistant'
import { createTestApiKey } from '../lib/apiKeys/createTestApiKey'
import { createTestTask } from '../lib/tasks/createTestTask'
import { serializeTask } from '../../src/lib/tasks/serializeTask'
import { TaskScheduleConflictError } from '../../src/lib/errors'

type PublishCall = {
  args: [{ url: string; body: { taskId: string }; delay: number }]
  messageId: string
}

const publishJSONCalls: PublishCall[] = []
const deleteCalls: string[] = []
let nextPublishMessageId: string | null = null

const qstashModuleMock: MockModuleOptions = {
  namedExports: {
    qstash: {
      publishJSON: async (args: PublishCall['args'][number]) => {
        const messageId = nextPublishMessageId ?? randomUUID()
        publishJSONCalls.push({ args: [args], messageId })
        return { messageId }
      },
      messages: {
        delete: async (id: string) => {
          deleteCalls.push(id)
        },
      },
    },
  },
}

mock.module('@/lib/upstash/qstash', qstashModuleMock)

beforeEach(() => {
  publishJSONCalls.length = 0
  deleteCalls.length = 0
  nextPublishMessageId = null
})

const appHandler = await import('../../src/app/api/tasks/[taskId]/route')

describe('/api/tasks/[taskId]', () => {
  describe('GET', () => {
    it('returns 400 when no authorization header is provided', async () => {
      await testApiHandler({
        appHandler,
        params: { taskId: randomUUID() },
        test: async ({ fetch }) => {
          const response = await fetch({ method: 'GET' })
          const data = await response.json()
          assert.strictEqual(response.status, 400)
          assert.strictEqual(data.error, 'No authorization header found')
        },
      })
    })

    it('returns task when valid private API key is provided', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: { workspaceId: workspace.id },
      })
      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4o-mini',
          storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        },
      })
      const thread = await prisma.thread.create({
        data: { assistantId: assistant.id },
      })
      const task = await createTestTask({
        data: { threadId: thread.id, qstashMessageId: 'msg-1' },
      })
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      await testApiHandler({
        appHandler,
        params: { taskId: task.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'GET',
            headers: { Authorization: `Bearer ${privateKey.value}` },
          })
          const data = await response.json()
          assert.strictEqual(response.status, 200)
          assert.deepStrictEqual(data.task, serializeTask({ task }))
        },
      })
    })

    it('returns 400 when taskId is invalid', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: { workspaceId: workspace.id },
      })
      await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4o-mini',
          storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        },
      })
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      await testApiHandler({
        appHandler,
        params: { taskId: 'invalid' },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'GET',
            headers: { Authorization: `Bearer ${privateKey.value}` },
          })
          const data = await response.json()
          assert.strictEqual(response.status, 400)
          assert.strictEqual(data.error, 'Invalid task id')
        },
      })
    })
  })

  describe('PATCH', () => {
    it('updates task when valid payload provided', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: { workspaceId: workspace.id },
      })
      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4o-mini',
          storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        },
      })
      const thread = await prisma.thread.create({
        data: { assistantId: assistant.id },
      })
      const task = await createTestTask({
        data: { threadId: thread.id, qstashMessageId: 'msg-2' },
      })
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      const newStart = new Date(Date.now() + 45 * 60 * 1000).toISOString()

      await testApiHandler({
        appHandler,
        params: { taskId: task.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'PATCH',
            body: JSON.stringify({
              title: 'Updated',
              schedule: { start: newStart },
            }),
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${privateKey.value}`,
            },
          })
          const data = await response.json()
          assert.strictEqual(response.status, 200)
          const dbTask = await prisma.task.findUnique({
            where: { id: task.id },
          })
          assert.ok(dbTask)
          assert.strictEqual(dbTask!.title, 'Updated')
          assert.strictEqual(
            (dbTask!.schedule as { start: string }).start,
            newStart,
          )
          const serialized = serializeTask({ task: dbTask! })
          const { updatedAt: responseUpdatedAt, ...restResponse } = data.task
          const { updatedAt: dbUpdatedAt, ...restDb } = serialized
          assert.deepStrictEqual(restResponse, restDb)
          assert.ok(
            new Date(responseUpdatedAt).getTime() <=
              new Date(dbUpdatedAt).getTime(),
          )
        },
      })
    })

    it('returns 400 when schedule is invalid', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: { workspaceId: workspace.id },
      })
      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4o-mini',
          storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        },
      })
      const thread = await prisma.thread.create({
        data: { assistantId: assistant.id },
      })
      const task = await createTestTask({
        data: { threadId: thread.id, qstashMessageId: 'msg-3' },
      })
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      await testApiHandler({
        appHandler,
        params: { taskId: task.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'PATCH',
            body: JSON.stringify({ schedule: { start: 'invalid' } }),
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${privateKey.value}`,
            },
          })
          const data = await response.json()
          assert.strictEqual(response.status, 400)
          assert.strictEqual(data.error, 'Invalid schedule')
        },
      })
    })

    it('returns 400 when task update would conflict within 15 minutes', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: { workspaceId: workspace.id },
      })
      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4o-mini',
          storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        },
      })
      const thread = await prisma.thread.create({
        data: { assistantId: assistant.id },
      })
      const baseStart = new Date().toISOString()
      await createTestTask({
        data: {
          threadId: thread.id,
          key: 'conflict',
          schedule: { start: baseStart },
        },
      })
      const targetTask = await createTestTask({
        data: {
          threadId: thread.id,
          key: 'unique',
          schedule: {
            start: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
          },
        },
      })
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      const newStart = new Date(Date.now() + 5 * 60 * 1000).toISOString()

      await testApiHandler({
        appHandler,
        params: { taskId: targetTask.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'PATCH',
            body: JSON.stringify({
              key: 'conflict',
              schedule: { start: newStart },
            }),
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${privateKey.value}`,
            },
          })
          const data = await response.json()
          assert.strictEqual(response.status, 400)
          assert.strictEqual(
            data.error,
            TaskScheduleConflictError.defaultMessage,
          )
        },
      })
    })

    it('requeues schedule and cancels previous qstash message on update', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: { workspaceId: workspace.id },
      })
      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4o-mini',
          storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        },
      })
      const thread = await prisma.thread.create({
        data: { assistantId: assistant.id },
      })
      const task = await createTestTask({
        data: {
          threadId: thread.id,
          key: 'requeue',
          schedule: { start: new Date().toISOString() },
          qstashMessageId: 'old-message-id',
        },
      })
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      const newStart = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      nextPublishMessageId = 'new-message-id'

      const originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        await testApiHandler({
          appHandler,
          params: { taskId: task.id },
          test: async ({ fetch }) => {
            const response = await fetch({
              method: 'PATCH',
              body: JSON.stringify({ schedule: { start: newStart } }),
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${privateKey.value}`,
              },
            })
            const data = await response.json()

            assert.strictEqual(response.status, 200)
            assert.deepStrictEqual(deleteCalls, ['old-message-id'])
            assert.strictEqual(publishJSONCalls.length, 1)
            assert.strictEqual(publishJSONCalls[0].messageId, 'new-message-id')

            const dbTask = await prisma.task.findUnique({
              where: { id: task.id },
            })
            assert.ok(dbTask)
            assert.strictEqual(dbTask!.qstashMessageId, 'new-message-id')
            assert.strictEqual(
              (dbTask!.schedule as { start: string }).start,
              newStart,
            )
            const serialized = serializeTask({ task: dbTask! })
            const { updatedAt: responseUpdatedAt, ...restResponse } = data.task
            const { updatedAt: dbUpdatedAt, ...restDb } = serialized
            assert.deepStrictEqual(restResponse, restDb)
            assert.ok(
              new Date(responseUpdatedAt).getTime() <=
                new Date(dbUpdatedAt).getTime(),
            )
          },
        })
      } finally {
        process.env.NODE_ENV = originalNodeEnv
      }
    })
  })

  describe('DELETE', () => {
    it('deletes task when valid private API key is provided', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: { workspaceId: workspace.id },
      })
      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4o-mini',
          storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        },
      })
      const thread = await prisma.thread.create({
        data: { assistantId: assistant.id },
      })
      const task = await createTestTask({
        data: { threadId: thread.id, qstashMessageId: 'msg-4' },
      })
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      await testApiHandler({
        appHandler,
        params: { taskId: task.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'DELETE',
            headers: { Authorization: `Bearer ${privateKey.value}` },
          })
          const data = await response.json()
          assert.strictEqual(response.status, 200)
          const dbTask = await prisma.task.findUnique({
            where: { id: task.id },
          })
          assert.strictEqual(dbTask, null)
          assert.strictEqual(data.task.id, task.id)
        },
      })
    })
  })

  describe('OPTIONS', () => {
    it('handles OPTIONS request', async () => {
      await testApiHandler({
        appHandler,
        params: { taskId: randomUUID() },
        test: async ({ fetch }) => {
          const response = await fetch({ method: 'OPTIONS' })
          assert.strictEqual(response.status, 200)
        },
      })
    })
  })
})
