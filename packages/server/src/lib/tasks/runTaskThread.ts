import type { Prisma, PrismaClient } from '@prisma/client'
import { createMessageResponse } from '@superinterface/react/server'
import { assistantClientAdapter } from '@/lib/assistants/assistantClientAdapter'
import { createRunOpts } from '@/lib/runs/createRunOpts'
import { handleToolCall } from '@/lib/toolCalls/handleToolCall'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import { resolveStorageThreadId } from '@/lib/threads/resolveStorageThreadId'
import { threadErrorResponse } from '@/lib/threads/threadErrorResponse'
import { drainTaskMessageStream } from '@/lib/tasks/drainTaskMessageStream'
import { createTaskMessage } from '@/lib/tasks/createTaskMessage'
import type { taskRunInclude } from '@/lib/tasks/taskRunInclude'

// Posts the task message to its thread and runs the assistant to completion.
// Returns an error response when a step fails, and nothing once the run is
// done.
export const runTaskThread = async ({
  task,
  prisma,
}: {
  task: Prisma.TaskGetPayload<{ include: typeof taskRunInclude }>
  prisma: PrismaClient
}) => {
  const thread = task.thread
  const assistant = thread.assistant
  const assistantClient = assistantClientAdapter({ assistant, prisma })

  const resolved = await resolveStorageThreadId({
    assistant,
    thread,
    prisma,
    supportsManagedThreadId: isOpenaiAssistantsStorageProvider,
  })

  if (resolved.errorResponse) return resolved.errorResponse

  const { storageThreadId } = resolved

  const createMessageErrorResponse = await createTaskMessage({
    task,
    assistantClient,
    storageThreadId,
    prisma,
  })

  if (createMessageErrorResponse) return createMessageErrorResponse

  let createRunStream

  try {
    createRunStream = await assistantClient.beta.threads.runs.create(
      storageThreadId,
      await createRunOpts({ assistant, thread, prisma }),
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log({ error })
    return threadErrorResponse({
      prisma,
      assistant,
      thread,
      logMessage: `Failed to create run stream: ${error.message}`,
      error: 'Failed to create run stream',
    })
  }

  await drainTaskMessageStream({
    messageResponse: createMessageResponse({
      client: assistantClient,
      createRunStream,
      handleToolCall: handleToolCall({ assistant, thread, prisma }),
    }),
  })
}
