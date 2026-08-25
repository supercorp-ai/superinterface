import { NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { createMessageResponse } from '@superinterface/react/server'
import {
  LogRequestMethod,
  LogRequestRoute,
  LogLevel,
  type PrismaClient,
} from '@prisma/client'
import { assistantClientAdapter } from '@/lib/assistants/assistantClientAdapter'
import { createRunOpts } from '@/lib/runs/createRunOpts'
import { scheduleTask } from '@/lib/tasks/scheduleTask'
import { defaultScheduler } from '@/lib/tasks/schedulers/defaultScheduler'
import type { TaskScheduler } from '@/lib/tasks/schedulers/types'
import {
  defaultTaskExecutionLocker,
  TASK_EXECUTION_LOCK_TTL_SECONDS,
  type TaskExecutionLocker,
} from '@/lib/tasks/taskExecutionLocker'
import { handleToolCall } from '@/lib/toolCalls/handleToolCall'
import { createLog } from '@/lib/logs/createLog'
import { storageThreadId as getStorageThreadId } from '@/lib/threads/storageThreadId'
import { redis } from '@/lib/redis'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import { managedOpenaiThreadId } from '@/lib/threads/managedOpenaiThreadId'
import { serializeMetadata } from '@/lib/metadata/serializeMetadata'

export const maxDuration = 800
export const TASK_EXECUTION_RETRY_AFTER_SECONDS = 30

type TaskExecutor = ({ taskId }: { taskId: string }) => Promise<Response | null>

const ignoredResponse = ({ reason }: { reason: string }) =>
  NextResponse.json({ ok: true, ignored: reason })

const isStaleDelivery = ({
  incomingMessageId,
  currentMessageId,
}: {
  incomingMessageId: string | null
  currentMessageId: string | null
}) => Boolean(incomingMessageId && incomingMessageId !== currentMessageId)

const buildPostHandler =
  ({
    prisma,
    scheduler = defaultScheduler,
    callbackUrl,
    taskExecutionLocker = defaultTaskExecutionLocker,
    taskExecutor,
  }: {
    prisma: PrismaClient
    scheduler?: TaskScheduler
    callbackUrl?: string
    taskExecutionLocker?: TaskExecutionLocker
    taskExecutor?: TaskExecutor
  }) =>
  async (request: Request) => {
    const { taskId } = await request.json()
    const incomingMessageId = request.headers.get('upstash-message-id')
    const initialTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: { qstashMessageId: true },
    })

    if (!initialTask) {
      return ignoredResponse({ reason: 'task_deleted' })
    }

    if (
      isStaleDelivery({
        incomingMessageId,
        currentMessageId: initialTask.qstashMessageId,
      })
    ) {
      return ignoredResponse({ reason: 'stale_delivery' })
    }

    const executionLease = await taskExecutionLocker.acquire({
      taskId,
      ttlSeconds: TASK_EXECUTION_LOCK_TTL_SECONDS,
    })

    if (!executionLease) {
      return NextResponse.json(
        { error: 'Task execution already in progress' },
        {
          status: 503,
          headers: {
            'Retry-After': String(TASK_EXECUTION_RETRY_AFTER_SECONDS),
          },
        },
      )
    }

    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          thread: {
            include: {
              assistant: {
                include: {
                  modelProvider: true,
                  tools: {
                    include: {
                      fileSearchTool: true,
                      webSearchTool: true,
                      imageGenerationTool: true,
                      codeInterpreterTool: true,
                      computerUseTool: {
                        include: {
                          mcpServer: {
                            include: {
                              stdioTransport: true,
                              sseTransport: true,
                              httpTransport: true,
                            },
                          },
                        },
                      },
                    },
                  },
                  functions: {
                    include: {
                      handler: {
                        include: {
                          requestHandler: true,
                          firecrawlHandler: true,
                          replicateHandler: true,
                          clientToolHandler: true,
                          assistantHandler: true,
                          createTaskHandler: true,
                          listTasksHandler: true,
                          updateTaskHandler: true,
                          deleteTaskHandler: true,
                        },
                      },
                    },
                  },
                  mcpServers: {
                    include: {
                      computerUseTool: true,
                      stdioTransport: true,
                      sseTransport: true,
                      httpTransport: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      if (!task) {
        return ignoredResponse({ reason: 'task_deleted' })
      }

      if (
        isStaleDelivery({
          incomingMessageId,
          currentMessageId: task.qstashMessageId,
        })
      ) {
        return ignoredResponse({ reason: 'stale_delivery' })
      }

      if (taskExecutor) {
        const taskExecutionResponse = await taskExecutor({ taskId: task.id })
        if (taskExecutionResponse) return taskExecutionResponse
      } else {
        const assistant = task.thread.assistant
        const thread = task.thread
        const assistantClient = assistantClientAdapter({ assistant, prisma })

        let storageThreadId

        try {
          storageThreadId = getStorageThreadId({
            thread,
          })
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          createLog({
            log: {
              requestMethod: LogRequestMethod.POST,
              requestRoute: LogRequestRoute.MESSAGES,
              level: LogLevel.ERROR,
              status: 500,
              message: 'Failed to get storage thread id.',
              workspaceId: assistant.workspaceId,
              assistantId: assistant.id,
              threadId: thread.id,
            },
            prisma,
          })

          return NextResponse.json(
            { error: 'Failed to get storage thread id.' },
            { status: 500 },
          )
        }

        if (
          !storageThreadId &&
          isOpenaiAssistantsStorageProvider({
            storageProviderType: assistant.storageProviderType,
          })
        ) {
          try {
            storageThreadId = await managedOpenaiThreadId({
              assistant,
              threadId: thread.id,
              prisma,
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (error: any) {
            createLog({
              log: {
                requestMethod: LogRequestMethod.POST,
                requestRoute: LogRequestRoute.MESSAGES,
                level: LogLevel.ERROR,
                status: 500,
                message: `Failed to get managed openai thread id: ${error.message}`,
                workspaceId: assistant.workspaceId,
                assistantId: assistant.id,
                threadId: thread.id,
              },
              prisma,
            })

            return NextResponse.json(
              { error: 'Failed to get managed openai thread id.' },
              { status: 500 },
            )
          }
        }

        if (!storageThreadId) {
          createLog({
            log: {
              requestMethod: LogRequestMethod.POST,
              requestRoute: LogRequestRoute.MESSAGES,
              level: LogLevel.ERROR,
              status: 500,
              message: 'Invalid thread configuration.',
              workspaceId: assistant.workspaceId,
              assistantId: assistant.id,
              threadId: thread.id,
            },
            prisma,
          })

          return NextResponse.json(
            { error: 'Invalid thread configuration.' },
            { status: 500 },
          )
        }

        try {
          await assistantClient.beta.threads.messages.create(storageThreadId, {
            role: 'user',
            content: task.message,
            metadata: serializeMetadata({
              variables: {
                superinterfaceCreatedByType: 'TASK',
                superinterfaceCreatedById: task.id,
              },
              workspaceId: assistant.workspaceId,
              prisma,
            }),
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          console.log({ error })
          createLog({
            log: {
              requestMethod: LogRequestMethod.POST,
              requestRoute: LogRequestRoute.MESSAGES,
              level: LogLevel.ERROR,
              status: 500,
              message: `Failed to create message: ${error.message}`,
              workspaceId: assistant.workspaceId,
              assistantId: assistant.id,
              threadId: thread.id,
            },
            prisma,
          })
          return NextResponse.json(
            { error: 'Failed to create message' },
            { status: 500 },
          )
        }

        let createRunStream
        try {
          createRunStream = await assistantClient.beta.threads.runs.create(
            storageThreadId,
            await createRunOpts({ assistant, thread, prisma }),
          )
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          console.log({ error })
          createLog({
            log: {
              requestMethod: LogRequestMethod.POST,
              requestRoute: LogRequestRoute.MESSAGES,
              level: LogLevel.ERROR,
              status: 500,
              message: `Failed to create run stream: ${error.message}`,
              workspaceId: assistant.workspaceId,
              assistantId: assistant.id,
              threadId: thread.id,
            },
            prisma,
          })
          return NextResponse.json(
            { error: 'Failed to create run stream' },
            { status: 500 },
          )
        }

        const messageResponse = createMessageResponse({
          client: assistantClient,
          createRunStream,
          handleToolCall: handleToolCall({ assistant, thread, prisma }),
        })

        const decoder = new TextDecoder()

        const reader = messageResponse.getReader()
        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          if (!value) continue

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let event: any

          try {
            event = JSON.parse(decoder.decode(value))
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (e) {
            continue
          }

          if (
            event.event === 'thread.run.requires_action' &&
            event.data?.required_action?.type === 'submit_client_tool_outputs'
          ) {
            const toolCalls =
              event.data.required_action.submit_client_tool_outputs.tool_calls

            if (Array.isArray(toolCalls)) {
              await Promise.all(
                toolCalls.map((toolCall: { id: string }) =>
                  redis.set(
                    `submit-client-tool-outputs:output:${toolCall.id}`,
                    'Client tools cannot be used during tasks',
                    { ex: 60 * 60 * 24 * 7 },
                  ),
                ),
              )
            }
          }
        }
      }

      const latestTask = await prisma.task.findUnique({
        where: { id: task.id },
      })

      if (!latestTask) {
        return ignoredResponse({ reason: 'task_deleted' })
      }

      if (
        isStaleDelivery({
          incomingMessageId,
          currentMessageId: latestTask.qstashMessageId,
        })
      ) {
        return ignoredResponse({ reason: 'task_changed' })
      }

      await scheduleTask({
        task: latestTask,
        prisma,
        scheduler,
        callbackUrl,
      })

      return NextResponse.json({ ok: true })
    } finally {
      await executionLease.release()
    }
  }

export const buildPOST = ({
  prisma,
  scheduler = defaultScheduler,
  callbackUrl,
  taskExecutionLocker = defaultTaskExecutionLocker,
  taskExecutor,
}: {
  prisma: PrismaClient
  scheduler?: TaskScheduler
  callbackUrl?: string
  taskExecutionLocker?: TaskExecutionLocker
  taskExecutor?: TaskExecutor
}) => {
  const postHandler = buildPostHandler({
    prisma,
    scheduler,
    callbackUrl,
    taskExecutionLocker,
    taskExecutor,
  })

  return process.env.NODE_ENV === 'test' ||
    !process.env.QSTASH_CURRENT_SIGNING_KEY
    ? postHandler
    : verifySignatureAppRouter(postHandler)
}
