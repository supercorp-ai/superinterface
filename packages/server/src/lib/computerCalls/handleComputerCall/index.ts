import OpenAI from 'openai'
import { Prisma, Thread, ToolType, type PrismaClient } from '@prisma/client'
import { closeMcpConnection } from '@/lib/mcpServers/closeMcpConnection'
import { connectMcpServer } from '@/lib/mcpServers/connectMcpServer'
import type { McpConnection } from '@/types'
import { getComputerCallActions } from '@/lib/computerCalls/getComputerCallActions'
import {
  failToolCall,
  type ToolCallLogScope,
} from '@/lib/toolCalls/failToolCall'
import { callComputerActions } from './callComputerActions'
import { computerCallOutput } from './computerCallOutput'
import { COMPUTER_CALL_TOOL_NAME } from './constants'

export const handleComputerCall = async ({
  assistant,
  toolCall,
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
    }
  }>
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  thread: Thread
  prisma: PrismaClient
}) => {
  const scope: ToolCallLogScope = {
    workspaceId: assistant.workspaceId,
    assistantId: assistant.id,
    threadId: thread.id,
  }

  const tool = assistant.tools.find(
    (tool) => tool.type === ToolType.COMPUTER_USE,
  )

  // Every COMPUTER_USE tool is created together with its computerUseTool.
  const mcpServer = tool?.computerUseTool!.mcpServer

  if (!mcpServer) {
    return failToolCall({
      toolCall,
      scope,
      message: 'No computer use tool configured.',
      output: 'No computer use tool configured.',
      prisma,
    })
  }

  const { actions, acknowledgedSafetyChecks } = getComputerCallActions({
    toolCall,
  })

  if (actions.length === 0) {
    return {
      tool_call_id: toolCall.id,
      output: 'No computer actions provided.',
    }
  }

  const rawAction = actions.length === 1 ? actions[0] : actions

  let mcpConnection: McpConnection | undefined

  try {
    ;({ mcpConnection } = await connectMcpServer({
      thread,
      assistant,
      mcpServer,
      prisma,
    }))

    const mcpServerToolOutput = await callComputerActions({
      mcpConnection,
      actions,
    })

    return {
      tool_call_id: toolCall.id,
      output: await computerCallOutput({
        mcpConnection,
        mcpServerToolOutput,
        assistant,
      }),
      acknowledged_safety_checks: acknowledgedSafetyChecks,
    }
  } catch (e) {
    // MCP SDK, transport and URL/header failures are all Error instances.
    const message = `Error calling ${COMPUTER_CALL_TOOL_NAME} with action ${JSON.stringify(rawAction)}: ${(e as Error).message}`

    return failToolCall({
      toolCall,
      scope,
      message,
      output: message,
      prisma,
    })
  } finally {
    if (mcpConnection) {
      // Closing the MCP SDK HTTP/SSE transports does not throw.
      await closeMcpConnection({
        mcpConnection,
      })
    }
  }
}
