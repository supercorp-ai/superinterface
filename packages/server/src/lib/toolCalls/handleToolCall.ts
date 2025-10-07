import OpenAI from 'openai'
import { Prisma, Thread } from '@prisma/client'
import { handleFunction } from '@/lib/functions/handleFunction'
import { handleComputerCall } from '@/lib/computerCalls/handleComputerCall'
import { LogRequestMethod, LogRequestRoute, LogLevel } from '@prisma/client'
import { createLog } from '@/lib/logs/createLog'

export const handleToolCall =
  ({
    assistant,
    thread,
  }: {
    assistant: Prisma.AssistantGetPayload<{
      include: {
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
      })
    } else if (toolCall.type === 'computer_call') {
      return handleComputerCall({
        assistant,
        toolCall,
        thread,
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
      })

      return {
        tool_call_id: toolCall.id,
        output: `Unknown tool call type: ${toolCall.type}`,
      }
    }
  }
