import { NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { createMessageResponse } from '@superinterface/react/server'
import { LogRequestMethod, LogRequestRoute, LogLevel } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { assistantClientAdapter } from '@/lib/assistants/assistantClientAdapter'
import { createRunOpts } from '@/lib/runs/createRunOpts'
import { scheduleTask } from '@/lib/tasks/scheduleTask'
import { handleToolCall } from '@/lib/toolCalls/handleToolCall'
import { createLog } from '@/lib/logs/createLog'
import { map } from 'p-iteration'
import { storageThreadId as getStorageThreadId } from '@/lib/threads/storageThreadId'
import { redis } from '@/lib/redis'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import { managedOpenaiThreadId } from '@/lib/threads/managedOpenaiThreadId'
import { serializeMetadata } from '@/lib/metadata/serializeMetadata'

export const maxDuration = 800

const postHandler = async (request: Request) => {
  const { taskId } = await request.json()
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
    return NextResponse.json({ error: 'Task not found' }, { status: 400 })
  }

  const assistant = task.thread.assistant
  const thread = task.thread
  const client = assistantClientAdapter({ assistant, prisma })

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
    })

    return NextResponse.json(
      { error: 'Invalid thread configuration.' },
      { status: 500 },
    )
  }

  try {
    await client.beta.threads.messages.create(storageThreadId, {
      role: 'user',
      content: task.message,
      metadata: serializeMetadata({
        variables: {
          superinterfaceCreatedByType: 'TASK',
          superinterfaceCreatedById: task.id,
        },
        workspaceId: assistant.workspaceId,
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
    })
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 },
    )
  }

  let createRunStream
  try {
    createRunStream = await client.beta.threads.runs.create(
      storageThreadId,
      await createRunOpts({ assistant, thread }),
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
    })
    return NextResponse.json(
      { error: 'Failed to create run stream' },
      { status: 500 },
    )
  }

  const messageResponse = createMessageResponse({
    client,
    createRunStream,
    handleToolCall: handleToolCall({ assistant, thread }),
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
      await map(
        event.data.required_action.submit_client_tool_outputs.tool_calls,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (toolCall: any) => {
          await redis.set(
            `submit-client-tool-outputs:output:${toolCall.id}`,
            'Client tools cannot be used during tasks',
            { ex: 60 * 60 * 24 * 7 },
          )
        },
      )
    }
  }

  await scheduleTask({ task })

  return NextResponse.json({ ok: true })
}

export const POST =
  process.env.NODE_ENV === 'test' || !process.env.QSTASH_CURRENT_SIGNING_KEY
    ? postHandler
    : verifySignatureAppRouter(postHandler)
