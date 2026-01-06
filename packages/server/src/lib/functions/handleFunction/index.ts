import OpenAI from 'openai'
import {
  Prisma,
  HandlerType,
  Thread,
  LogRequestMethod,
  LogRequestRoute,
  LogLevel,
  type PrismaClient,
} from '@prisma/client'
import { createLog } from '@/lib/logs/createLog'
import { getFunction } from './getFunction'
import { handleRequest } from './handleRequest'
import { handleFirecrawl } from './handleFirecrawl'
import { handleReplicate } from './handleReplicate'
import { handleAssistant } from './handleAssistant'
import { handleClientTool } from './handleClientTool'
import { handleCreateTask } from './tasks/handleCreateTask'
import { handleListTasks } from './tasks/handleListTasks'
import { handleUpdateTask } from './tasks/handleUpdateTask'
import { handleDeleteTask } from './tasks/handleDeleteTask'
import { getToolCallMcpServer } from '@/lib/mcpServers/getToolCallMcpServer'
import { closeMcpConnection } from '@/lib/mcpServers/closeMcpConnection'
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'

export const handleFunction = async ({
  assistant,
  toolCall,
  controller,
  run,
  thread,
  prisma,
}: {
  assistant: Prisma.AssistantGetPayload<{
    include: {
      mcpServers: {
        include: {
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
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  controller: ReadableStreamDefaultController
  run: OpenAI.Beta.Threads.Runs.Run
  thread: Thread
  prisma: PrismaClient
}) => {
  const fn = getFunction({
    toolCall,
    assistant,
  })

  if (!fn) {
    const { mcpConnection, error } = await getToolCallMcpServer({
      toolCall,
      assistant,
      thread,
      prisma,
    })

    if (!mcpConnection) {
      if (error) {
        createLog({
          log: {
            requestMethod: LogRequestMethod.POST,
            requestRoute: LogRequestRoute.MESSAGES,
            level: LogLevel.ERROR,
            status: 500,
            message: `Error calling function ${toolCall.function.name}: ${error.message}`,
            workspaceId: assistant.workspaceId,
            assistantId: assistant.id,
            threadId: thread.id,
          },
          prisma,
        })

        return {
          tool_call_id: toolCall.id,
          output: `Error calling function ${toolCall.function.name}: ${error.message}`,
        }
      }

      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: `Function ${toolCall.function.name} not found.`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: `Function ${toolCall.function.name} not found.`,
      }
    }

    let args

    try {
      args = JSON.parse(toolCall.function.arguments || '{}')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 400,
          message: `Failed parsing function arguments: ${e.message}`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: `Failed parsing function arguments: ${e.message}`,
      }
    }

    try {
      const mcpServerToolOutput = await mcpConnection.client.callTool(
        {
          name: toolCall.function.name,
          arguments: args,
        },
        CallToolResultSchema,
        {
          timeout: 300000,
        },
      )

      await closeMcpConnection({
        mcpConnection,
      })

      return {
        tool_call_id: toolCall.id,
        output: JSON.stringify(mcpServerToolOutput),
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: `Error calling function ${toolCall.function.name}: ${e.message}`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: `Error calling function ${toolCall.function.name}: ${e.message}`,
      }
    }
  }

  if (!fn.handler) {
    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 500,
        message: `Function ${toolCall.function.name} has no handler.`,
        workspaceId: assistant.workspaceId,
        assistantId: assistant.id,
        threadId: thread.id,
      },
      prisma,
    })

    return {
      tool_call_id: toolCall.id,
      output: `Function ${toolCall.function.name} has no handler.`,
    }
  }

  if (fn.handler.type === HandlerType.REQUEST) {
    if (!fn.handler.requestHandler) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: `Function ${toolCall.function.name} has no request handler.`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: `Function ${toolCall.function.name} has no request handler.`,
      }
    }

    return handleRequest({
      requestHandler: fn.handler.requestHandler,
      toolCall,
      assistant,
      thread,
      prisma,
    })
  }

  if (fn.handler.type === HandlerType.CLIENT_TOOL) {
    if (!fn.handler.clientToolHandler) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: `Function ${toolCall.function.name} has no client tool handler.`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: `Function ${toolCall.function.name} has no client tool handler.`,
      }
    }

    return handleClientTool({
      clientToolHandler: fn.handler.clientToolHandler,
      controller,
      toolCall,
      assistant,
      thread,
      run,
      prisma,
    })
  }

  if (fn.handler.type === HandlerType.FIRECRAWL) {
    if (!fn.handler.firecrawlHandler) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: `Function ${toolCall.function.name} has no Firecrawl handler.`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: `Function ${toolCall.function.name} has no Firecrawl handler.`,
      }
    }

    return handleFirecrawl({
      firecrawlHandler: fn.handler.firecrawlHandler,
      toolCall,
      assistant,
      thread,
      prisma,
    })
  }

  if (fn.handler.type === HandlerType.REPLICATE) {
    if (!fn.handler.replicateHandler) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: `Function ${toolCall.function.name} has no Replicate handler.`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: `Function ${toolCall.function.name} has no Replicate handler.`,
      }
    }

    return handleReplicate({
      replicateHandler: fn.handler.replicateHandler,
      toolCall,
      assistant,
      thread,
      prisma,
    })
  }

  if (fn.handler.type === HandlerType.ASSISTANT) {
    if (!fn.handler.assistantHandler) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: `Function ${toolCall.function.name} has no assistant handler.`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: `Function ${toolCall.function.name} has no assistant handler.`,
      }
    }

    return handleAssistant({
      assistantHandler: fn.handler.assistantHandler,
      toolCall,
      controller,
      run,
      assistant,
      thread,
      prisma,
    })
  }

  if (fn.handler.type === HandlerType.CREATE_TASK) {
    const taskHandler = fn.handler.createTaskHandler

    if (!taskHandler) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: `Function ${toolCall.function.name} has no task handler.`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: `Function ${toolCall.function.name} has no task handler.`,
      }
    }

    return handleCreateTask({
      taskHandler,
      toolCall,
      assistant,
      thread,
      prisma,
    })
  }

  if (fn.handler.type === HandlerType.LIST_TASKS) {
    const taskHandler = fn.handler.listTasksHandler

    if (!taskHandler) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: `Function ${toolCall.function.name} has no task handler.`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: `Function ${toolCall.function.name} has no task handler.`,
      }
    }

    return handleListTasks({
      taskHandler,
      toolCall,
      assistant,
      thread,
      prisma,
    })
  }

  if (fn.handler.type === HandlerType.UPDATE_TASK) {
    const taskHandler = fn.handler.updateTaskHandler

    if (!taskHandler) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: `Function ${toolCall.function.name} has no task handler.`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: `Function ${toolCall.function.name} has no task handler.`,
      }
    }

    return handleUpdateTask({
      taskHandler,
      toolCall,
      assistant,
      thread,
      prisma,
    })
  }

  if (fn.handler.type === HandlerType.DELETE_TASK) {
    const taskHandler = fn.handler.deleteTaskHandler

    if (!taskHandler) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: `Function ${toolCall.function.name} has no task handler.`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: `Function ${toolCall.function.name} has no task handler.`,
      }
    }

    return handleDeleteTask({
      taskHandler,
      toolCall,
      assistant,
      thread,
      prisma,
    })
  }

  createLog({
    log: {
      requestMethod: LogRequestMethod.POST,
      requestRoute: LogRequestRoute.MESSAGES,
      level: LogLevel.ERROR,
      status: 500,
      message: `Function ${toolCall.function.name} handler type ${fn.handler.type} not supported.`,
      workspaceId: assistant.workspaceId,
      assistantId: assistant.id,
      threadId: thread.id,
    },
    prisma,
  })

  return {
    tool_call_id: toolCall.id,
    output: `Function ${toolCall.function.name} handler type ${fn.handler.type} not supported.`,
  }
}
