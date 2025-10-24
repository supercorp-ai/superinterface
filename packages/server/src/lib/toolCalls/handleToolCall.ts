import OpenAI from 'openai'
import { Prisma, Thread, type PrismaClient } from '@prisma/client'
import { handleFunction } from '@/lib/functions/handleFunction'
import { handleComputerCall } from '@/lib/computerCalls/handleComputerCall'
import { LogRequestMethod, LogRequestRoute, LogLevel } from '@prisma/client'
import { createLog } from '@/lib/logs/createLog'

export const handleToolCall =
  ({
    assistant,
    thread,
    prisma,
  }: {
    assistant: Prisma.AssistantGetPayload<{
      include: {
        modelProvider: true
        tools: {
          include: {
            computerUseTool: {
              include: {
                mcpServer: {
                  include: {
                    stdioTransport: true
                    sseTransport: true
                    httpTransport: true
                  }
                }
              }
            }
          }
        }
        mcpServers: {
          include: {
            computerUseTool: true
            stdioTransport: true
            httpTransport: true
            sseTransport: true
          }
        }
        functions: {
          include: {
            handler: {
              include: {
                requestHandler: true
                firecrawlHandler: true
                replicateHandler: true
                clientToolHandler: true
                assistantHandler: true
                createTaskHandler: true
                listTasksHandler: true
                updateTaskHandler: true
                deleteTaskHandler: true
              }
            }
          }
        }
      }
    }>
    thread: Thread
    prisma: PrismaClient
  }) =>
  async ({
    toolCall,
    controller,
    run,
  }: {
    toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
    controller: ReadableStreamDefaultController
    run: OpenAI.Beta.Threads.Runs.Run
  }) => {
    if (toolCall.type === 'function') {
      if (!toolCall.function) {
        createLog({
          log: {
            requestMethod: LogRequestMethod.POST,
            requestRoute: LogRequestRoute.MESSAGES,
            level: LogLevel.ERROR,
            status: 500,
            message: 'No function specified.',
            workspaceId: assistant.workspaceId,
            assistantId: assistant.id,
            threadId: thread.id,
          },
          prisma,
        })

        return {
          tool_call_id: toolCall.id,
          output: 'No function specified',
        }
      }

      return handleFunction({
        assistant,
        toolCall,
        controller,
        run,
        thread,
        prisma,
      })
    } else if (toolCall.type === 'computer_call') {
      return handleComputerCall({
        assistant,
        toolCall,
        thread,
        prisma,
      })
    } else {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: `Unknown tool call type: ${toolCall.type}`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: `Unknown tool call type: ${toolCall.type}`,
      }
    }
  }
