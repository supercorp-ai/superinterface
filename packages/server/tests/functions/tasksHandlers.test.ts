import { beforeEach, describe, it, mock } from 'node:test'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import {
  CreateTaskHandler,
  UpdateTaskHandler,
  StorageProviderType,
} from '@prisma/client'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'
import { createTestWorkspace } from '../lib/workspaces/createTestWorkspace'
import { createTestModelProvider } from '../lib/modelProviders/createTestModelProvider'
import { createTestAssistant } from '../lib/assistants/createTestAssistant'
import { createTestThread } from '../lib/threads/createTestThread'
import { createTestTask } from '../lib/tasks/createTestTask'
import { TaskScheduleConflictError } from '../../src/lib/errors'

type PublishCall = {
  args: [{ url: string; body: { taskId: string }; delay: number }]
  messageId: string
}

const publishJSONCalls: PublishCall[] = []
const deleteCalls: string[] = []
let nextPublishMessageId: string | null = null

mock.module('@/lib/upstash/qstash', {
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
} as any)

beforeEach(() => {
  publishJSONCalls.length = 0
  deleteCalls.length = 0
  nextPublishMessageId = null
})

const { handleCreateTask } = await import(
  '../../src/lib/functions/handleFunction/tasks/handleCreateTask'
)
const { handleUpdateTask } = await import(
  '../../src/lib/functions/handleFunction/tasks/handleUpdateTask'
)

const createToolCall = (args: Record<string, unknown>) =>
  ({
    id: randomUUID(),
    type: 'function',
    function: {
      name: 'tasks.create',
      arguments: JSON.stringify(args),
    },
  }) as OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall

describe('handleCreateTask', () => {
  it('creates task when no conflict is present', async () => {
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
    const thread = await createTestThread({
      data: { assistantId: assistant.id },
    })

    const taskHandler: CreateTaskHandler = {
      id: randomUUID(),
      handlerId: randomUUID(),
      keyTemplate: '{{threadId}}',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const start = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const toolCall = createToolCall({
      title: 'Foo',
      message: 'Bar',
      schedule: { start },
    })

    const result = await handleCreateTask({
      taskHandler,
      toolCall,
      assistant,
      thread,
      prisma,
    })

    assert.ok(result.output)
    const parsed = JSON.parse(result.output) as {
      task: { id: string; key: string }
    }
    const task = await prisma.task.findUnique({ where: { id: parsed.task.id } })
    assert.ok(task)
    assert.strictEqual(task!.key, thread.id)
    assert.strictEqual(parsed.task.key, thread.id)
  })

  it('returns conflict error when schedule overlaps within 15 minutes', async () => {
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
    const thread = await createTestThread({
      data: { assistantId: assistant.id },
    })

    const existingStart = new Date().toISOString()
    await createTestTask({
      data: {
        threadId: thread.id,
        key: thread.id,
        schedule: { start: existingStart },
      },
    })

    const taskHandler: CreateTaskHandler = {
      id: randomUUID(),
      handlerId: randomUUID(),
      keyTemplate: '{{threadId}}',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const overlappingStart = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    const toolCall = createToolCall({
      title: 'Foo',
      message: 'Bar',
      schedule: { start: overlappingStart },
    })

    const result = await handleCreateTask({
      taskHandler,
      toolCall,
      assistant,
      thread,
      prisma,
    })

    assert.strictEqual(result.output, TaskScheduleConflictError.defaultMessage)
  })
})

describe('handleUpdateTask', () => {
  const createUpdateToolCall = (args: Record<string, unknown>) =>
    ({
      id: randomUUID(),
      type: 'function',
      function: {
        name: 'tasks.update',
        arguments: JSON.stringify(args),
      },
    }) as OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall

  it('updates task when no conflict exists', async () => {
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
    const thread = await createTestThread({
      data: { assistantId: assistant.id },
    })

    const task = await createTestTask({
      data: {
        threadId: thread.id,
        key: thread.id,
        schedule: { start: new Date().toISOString() },
      },
    })

    const taskHandler: UpdateTaskHandler = {
      id: randomUUID(),
      handlerId: randomUUID(),
      keyTemplate: '{{threadId}}',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const newStart = new Date(Date.now() + 40 * 60 * 1000).toISOString()
    const toolCall = createUpdateToolCall({
      taskId: task.id,
      title: 'Updated',
      schedule: { start: newStart },
    })

    const result = await handleUpdateTask({
      taskHandler,
      toolCall,
      assistant,
      thread,
      prisma,
    })

    assert.ok(result.output)
    const parsed = JSON.parse(result.output) as {
      task: { id: string; title: string }
    }
    assert.strictEqual(parsed.task.id, task.id)
    assert.strictEqual(parsed.task.title, 'Updated')
    const dbTask = await prisma.task.findUnique({ where: { id: task.id } })
    assert.ok(dbTask)
    assert.strictEqual(dbTask!.title, 'Updated')
  })

  it('returns conflict error when updated schedule overlaps', async () => {
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
    const thread = await createTestThread({
      data: { assistantId: assistant.id },
    })

    const existingStart = new Date().toISOString()
    await createTestTask({
      data: {
        threadId: thread.id,
        key: thread.id,
        schedule: { start: existingStart },
      },
    })

    const taskToUpdate = await createTestTask({
      data: {
        threadId: thread.id,
        key: thread.id,
        schedule: {
          start: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        },
      },
    })

    const taskHandler: UpdateTaskHandler = {
      id: randomUUID(),
      handlerId: randomUUID(),
      keyTemplate: '{{threadId}}',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const overlappingStart = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const toolCall = createUpdateToolCall({
      taskId: taskToUpdate.id,
      schedule: { start: overlappingStart },
    })

    const result = await handleUpdateTask({
      taskHandler,
      toolCall,
      assistant,
      thread,
      prisma,
    })

    assert.strictEqual(result.output, TaskScheduleConflictError.defaultMessage)
  })

  it('requeues qstash message when schedule updates', async () => {
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
    const thread = await createTestThread({
      data: { assistantId: assistant.id },
    })

    const task = await createTestTask({
      data: {
        threadId: thread.id,
        key: thread.id,
        schedule: { start: new Date().toISOString() },
        qstashMessageId: 'function-old-message',
      },
    })

    const taskHandler: UpdateTaskHandler = {
      id: randomUUID(),
      handlerId: randomUUID(),
      keyTemplate: '{{threadId}}',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const newStart = new Date(Date.now() + 50 * 60 * 1000).toISOString()
    nextPublishMessageId = 'function-new-message'

    const toolCall = createUpdateToolCall({
      taskId: task.id,
      schedule: { start: newStart },
    })

    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    try {
      const result = await handleUpdateTask({
        taskHandler,
        toolCall,
        assistant,
        thread,
        prisma,
      })

      assert.ok(result.output)
      assert.deepStrictEqual(deleteCalls, ['function-old-message'])
      assert.strictEqual(publishJSONCalls.length, 1)
      assert.strictEqual(publishJSONCalls[0].messageId, 'function-new-message')

      const dbTask = await prisma.task.findUnique({ where: { id: task.id } })
      assert.ok(dbTask)
      assert.strictEqual(dbTask!.qstashMessageId, 'function-new-message')
      assert.strictEqual(
        (dbTask!.schedule as { start: string }).start,
        newStart,
      )
    } finally {
      process.env.NODE_ENV = originalNodeEnv
    }
  })
})
