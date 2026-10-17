import type OpenAI from 'openai'
import type { Prisma, PrismaClient } from '@prisma/client'
import { serializeMetadata } from '@/lib/metadata/serializeMetadata'
import { threadErrorResponse } from '@/lib/threads/threadErrorResponse'
import type { taskRunInclude } from '@/lib/tasks/taskRunInclude'

const TASK_CREATED_BY_TYPE = 'TASK'

// Adds the task's message to its storage thread, marked as created by the
// task. Returns an error response when that fails.
export const createTaskMessage = async ({
  task,
  assistantClient,
  storageThreadId,
  prisma,
}: {
  task: Prisma.TaskGetPayload<{ include: typeof taskRunInclude }>
  assistantClient: OpenAI
  storageThreadId: string
  prisma: PrismaClient
}) => {
  const thread = task.thread
  const assistant = thread.assistant

  try {
    await assistantClient.beta.threads.messages.create(storageThreadId, {
      role: 'user',
      content: task.message,
      metadata: serializeMetadata({
        variables: {
          superinterfaceCreatedByType: TASK_CREATED_BY_TYPE,
          superinterfaceCreatedById: task.id,
        },
        workspaceId: assistant.workspaceId,
        prisma,
      }),
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log({ error })

    return threadErrorResponse({
      prisma,
      assistant,
      thread,
      logMessage: `Failed to create message: ${error.message}`,
      error: 'Failed to create message',
    })
  }
}
