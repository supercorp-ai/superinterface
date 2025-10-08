import OpenAI from 'openai'
import {
  AssistantHandler,
  LogRequestMethod,
  LogRequestRoute,
  LogLevel,
  Assistant,
  Thread,
  type PrismaClient,
} from '@prisma/client'
import { createMessageResponse } from '@superinterface/react/server'
import { assistantClientAdapter } from '@/lib/assistants/assistantClientAdapter'
import { createThread } from '@/lib/threads/createThread'
import { managedOpenaiThreadId } from '@/lib/threads/managedOpenaiThreadId'
import { storageThreadId as getStorageThreadId } from '@/lib/threads/storageThreadId'
import { streamOutput } from '@/lib/toolCalls/streamOutput'
import { messagesToOutput } from '@/lib/toolCalls/messagesToOutput'
import { createRunOpts } from '@/lib/runs/createRunOpts'
import { handleToolCall } from '@/lib/toolCalls/handleToolCall'
import { createLog } from '@/lib/logs/createLog'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import { map } from 'p-iteration'
import { redis } from '@/lib/redis'
import { waitUntil } from '@vercel/functions'

export const handleAssistant = async ({
  assistantHandler,
  toolCall,
  controller,
  run,
  assistant: parentAssistant,
  thread: parentThread,
  prisma,
}: {
  assistantHandler: AssistantHandler
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  controller: ReadableStreamDefaultController
  run: OpenAI.Beta.Threads.Runs.Run
  assistant: Assistant
  thread: Thread
  prisma: PrismaClient
}) => {
  let args

  try {
    args = JSON.parse(toolCall.function.arguments)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 500,
        message: `Failed parsing Assistant function arguments: ${e.message}`,
        workspaceId: parentAssistant.workspaceId,
        assistantId: parentAssistant.id,
        threadId: parentThread.id,
      },
      prisma,
    })

    return {
      tool_call_id: toolCall.id,
      output: 'Invalid arguments.',
    }
  }

  const assistant = await prisma.assistant.findUnique({
    where: {
      id: assistantHandler.assistantId,
    },
    include: {
      modelProvider: true,
      initialMessages: true,
      mcpServers: {
        include: {
          computerUseTool: true,
          stdioTransport: true,
          httpTransport: true,
          sseTransport: true,
        },
      },
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
            },
          },
        },
      },
    },
  })

  if (!assistant) {
    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 500,
        message: 'Assistant not found when handling Assistant function.',
        workspaceId: parentAssistant.workspaceId,
        assistantId: parentAssistant.id,
        threadId: parentThread.id,
      },
      prisma,
    })

    return {
      tool_call_id: toolCall.id,
      output: 'Assistant not found.',
    }
  }

  const createThreadClient = assistantClientAdapter({ assistant, prisma })

  let thread
  try {
    thread = await createThread({
      client: createThreadClient,
      assistant,
      prisma,
      variables: parentThread.metadata ?? {},
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  } catch (e: any) {
    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 500,
        message: 'Failed creating thread inside Assistant function.',
        workspaceId: assistant.workspaceId,
        assistantId: assistant.id,
      },
      prisma,
    })

    return {
      tool_call_id: toolCall.id,
      output: 'Failed creating thread.',
    }
  }

  let storageThreadId

  try {
    storageThreadId = getStorageThreadId({
      thread,
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  } catch (_e: any) {
    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 500,
        message: 'Failed getting storage thread ID.',
        workspaceId: assistant.workspaceId,
        assistantId: assistant.id,
        threadId: thread.id,
      },
      prisma,
    })

    return {
      tool_call_id: toolCall.id,
      output: 'Failed getting storage thread ID.',
    }
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    } catch (e: any) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: 'Failed getting managed OpenAI thread ID.',
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: 'Failed getting managed OpenAI thread ID.',
      }
    }
  }

  if (!storageThreadId) {
    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 500,
        message: 'Invalid thread configuration',
        workspaceId: assistant.workspaceId,
        assistantId: assistant.id,
        threadId: thread.id,
      },
      prisma,
    })

    return {
      tool_call_id: toolCall.id,
      output: 'Invalid thread configuration',
    }
  }

  const client = assistantClientAdapter({
    assistant,
    prisma,
    thread,
  })

  try {
    await client.beta.threads.messages.create(storageThreadId, {
      role: 'user',
      content: args.message,
      metadata: {
        assistantId: assistant.id,
        toolCallId: toolCall.id,
      },
      // ...(attachments?.length ? { attachments } : {}),
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  } catch (e: any) {
    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 500,
        message: `Failed creating message.`,
        workspaceId: assistant.workspaceId,
        assistantId: assistant.id,
        threadId: thread.id,
      },
      prisma,
    })

    return {
      tool_call_id: toolCall.id,
      output: 'Failed creating message.',
    }
  }

  let createRunStream

  const runOpts = await createRunOpts({
    assistant,
    thread,
    prisma,
  })

  try {
    createRunStream = await client.beta.threads.runs.create(
      storageThreadId,
      runOpts,
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 500,
        message: `Failed creating run stream: ${e.message}`,
        workspaceId: assistant.workspaceId,
        assistantId: assistant.id,
        threadId: thread.id,
      },
      prisma,
    })

    return {
      tool_call_id: toolCall.id,
      output: 'Failed creating run stream.',
    }
  }

  const messageResponse = createMessageResponse({
    client,
    createRunStream,
    handleToolCall: handleToolCall({
      assistant,
      thread,
      prisma,
    }),
  })

  if (assistant.id === 'a606a15d-c9a2-45d3-8e54-ee088a500008') {
    waitUntil(
      new Promise(async (resolve) => {
        const decoder = new TextDecoder()
        const reader = messageResponse.getReader()
        // // consume the stream so tool calls are processed
        // while (!(await reader.read()).done) {}
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
                  'Client tools cannot be used during async assistant calls',
                  { ex: 60 * 60 * 24 * 7 },
                )
              },
            )
          }
        }

        console.log('Successfully done with async assistant handler.')
        resolve(true)
      }),
    )

    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify({
        status: 'in_progress',
      }),
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages = [] as any[]

  await streamOutput({
    toolCall,
    messageResponse,
    controller,
    run,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onThreadMessageCompleted: ({ message }: { message: any }) => {
      messages.push(message)
    },
  })

  return {
    tool_call_id: toolCall.id,
    output: messagesToOutput({
      messages,
    }),
  }
}
