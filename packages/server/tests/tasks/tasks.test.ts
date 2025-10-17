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
import { FIFTEEN_MINUTES_IN_MS } from '../../src/lib/tasks/getTaskScheduleConflict'

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

const appHandler = await import('../../src/app/api/tasks/route')

describe('/api/tasks', () => {
  describe('GET', () => {
    it('returns 400 when no authorization header is provided', async () => {
      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({ method: 'GET' })
          const data = await response.json()

          assert.strictEqual(response.status, 400)
          assert.strictEqual(data.error, 'No authorization header found')
        },
      })
    })

    it('returns 400 when invalid API key format is provided', async () => {
      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'GET',
            headers: { Authorization: 'Bearer invalid' },
          })
          const data = await response.json()

          assert.strictEqual(response.status, 400)
          assert.strictEqual(data.error, 'Invalid api key')
        },
      })
    })

    it('returns tasks list for valid private API key', async () => {
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
      const task = await createTestTask({ data: { threadId: thread.id } })
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'GET',
            headers: { Authorization: `Bearer ${privateKey.value}` },
          })
          const data = await response.json()

          assert.strictEqual(response.status, 200)
          const found = data.tasks.find((t: { id: string }) => t.id === task.id)
          assert.ok(found)
          assert.deepStrictEqual(found, serializeTask({ task }))
        },
      })
    })

    it('filters tasks by key when provided', async () => {
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
      await createTestTask({ data: { threadId: thread.id, key: 'alpha' } })
      const betaTask = await createTestTask({
        data: { threadId: thread.id, key: 'beta' },
      })
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      await testApiHandler({
        appHandler,
        url: '?key=beta',
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'GET',
            headers: { Authorization: `Bearer ${privateKey.value}` },
          })
          const data = await response.json()

          assert.strictEqual(response.status, 200)
          assert.strictEqual(data.tasks.length, 1)
          assert.strictEqual(data.tasks[0].id, betaTask.id)
        },
      })
    })
  })

  describe('POST', () => {
    it('returns 400 when no authorization header is provided', async () => {
      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            body: JSON.stringify({
              title: 'Test',
              message: 'Message',
              schedule: { start: new Date().toISOString() },
              threadId: randomUUID(),
            }),
            headers: { 'Content-Type': 'application/json' },
          })
          const data = await response.json()

          assert.strictEqual(response.status, 400)
          assert.strictEqual(data.error, 'No authorization header found')
        },
      })
    })

    it('creates task for valid private API key', async () => {
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
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })
      const start = new Date(Date.now() + 30 * 60 * 1000).toISOString()

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            body: JSON.stringify({
              title: 'Foo',
              message: 'Bar',
              schedule: { start },
              threadId: thread.id,
              key: 'unique',
            }),
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${privateKey.value}`,
            },
          })
          const data = await response.json()

          assert.strictEqual(response.status, 200)
          const dbTask = await prisma.task.findUnique({
            where: { id: data.task.id },
          })
          assert.ok(dbTask)
          const dbSerialized = serializeTask({ task: dbTask! })
          const { updatedAt: responseUpdatedAt, ...restResponse } = data.task
          const { updatedAt: dbUpdatedAt, ...restDb } = dbSerialized
          assert.deepStrictEqual(restResponse, restDb)
          assert.ok(
            new Date(responseUpdatedAt).getTime() <=
              new Date(dbUpdatedAt).getTime(),
          )
        },
      })
    })

    it('returns 400 for invalid payload', async () => {
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
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            body: JSON.stringify({ threadId: thread.id }),
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${privateKey.value}`,
            },
          })
          const data = await response.json()

          assert.strictEqual(response.status, 400)
          assert.strictEqual(data.error, 'Invalid payload')
        },
      })
    })

    it('returns 400 when duplicate task scheduled within 15 minutes', async () => {
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
      const start = new Date().toISOString()
      await createTestTask({
        data: { threadId: thread.id, key: 'dup', schedule: { start } },
      })

      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      const nextStart = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            body: JSON.stringify({
              title: 'Another',
              message: 'Dup',
              schedule: { start: nextStart },
              threadId: thread.id,
              key: 'dup',
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

    it('creates task when schedule is at least 15 minutes apart', async () => {
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
          key: 'boundary',
          schedule: { start: baseStart },
        },
      })

      const newStart = new Date(
        new Date(baseStart).getTime() + FIFTEEN_MINUTES_IN_MS,
      ).toISOString()

      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      nextPublishMessageId = 'new-boundary-message'

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            body: JSON.stringify({
              title: 'Boundary',
              message: 'Allowed',
              schedule: { start: newStart },
              threadId: thread.id,
              key: 'boundary',
            }),
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${privateKey.value}`,
            },
          })
          const data = await response.json()

          assert.strictEqual(response.status, 200)
          const createdTask = await prisma.task.findUnique({
            where: { id: data.task.id },
          })
          assert.ok(createdTask)
          assert.strictEqual(
            createdTask!.qstashMessageId,
            'new-boundary-message',
          )
          assert.strictEqual(publishJSONCalls.length, 1)
          assert.strictEqual(
            publishJSONCalls[0].messageId,
            'new-boundary-message',
          )

          const serialized = serializeTask({ task: createdTask! })
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
  })

  describe('OPTIONS', () => {
    it('handles OPTIONS request', async () => {
      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({ method: 'OPTIONS' })
          assert.strictEqual(response.status, 200)
        },
      })
    })
  })
})
