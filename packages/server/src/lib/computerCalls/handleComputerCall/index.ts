import OpenAI from 'openai'
import {
  ModelProviderType,
  Prisma,
  Thread,
  LogRequestMethod,
  LogRequestRoute,
  LogLevel,
  ToolType,
  type PrismaClient,
} from '@prisma/client'
import { createLog } from '@/lib/logs/createLog'
import { closeMcpConnection } from '@/lib/mcpServers/closeMcpConnection'
import {
  CallToolResultSchema,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js'
import { connectMcpServer } from '@/lib/mcpServers/connectMcpServer'

const getContent = ({
  mcpServerToolOutput,
}: {
  mcpServerToolOutput: CallToolResult
}) => mcpServerToolOutput.content.find((c) => c.type === 'image')

const getImageUrl = ({
  mcpServerToolOutput,
}: {
  mcpServerToolOutput: CallToolResult
}) => {
  const content = getContent({ mcpServerToolOutput })
  if (!content) return null

  return `data:${content.mimeType};base64,${content.data}`
}

const serializeOutput = ({
  assistant,
  imageUrl,
}: {
  assistant: Prisma.AssistantGetPayload<{
    include: {
      modelProvider: true
    }
  }>
  imageUrl: string
}) => {
  if (assistant.modelProvider.type === ModelProviderType.ANTHROPIC) {
    return [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: imageUrl.split(',')[1],
        },
      },
    ]
  }

  return JSON.stringify({
    type: 'computer_screenshot',
    image_url: imageUrl,
  })
}

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
  const tool = assistant.tools.find(
    (tool) => tool.type === ToolType.COMPUTER_USE,
  )

  if (!tool || !tool.computerUseTool || !tool.computerUseTool.mcpServer) {
    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 500,
        message: 'No computer use tool configured.',
        workspaceId: assistant.workspaceId,
        assistantId: assistant.id,
        threadId: thread.id,
      },
      prisma,
    })

    return {
      tool_call_id: toolCall.id,
      output: 'No computer use tool configured.',
    }
  }

  const { mcpConnection } = await connectMcpServer({
    thread,
    assistant,
    mcpServer: tool.computerUseTool.mcpServer,
    prisma,
  })

  try {
    const mcpServerToolOutput = (await mcpConnection.client.callTool(
      {
        name: 'computer_call',
        arguments: {
          // @ts-expect-error computer_call is compatability type
          action: toolCall.computer_call.action,
        },
      },
      CallToolResultSchema,
      {
        timeout: 300000,
      },
    )) as CallToolResult

    await closeMcpConnection({
      mcpConnection,
    })

    const imageUrl = getImageUrl({
      mcpServerToolOutput,
    })

    if (!imageUrl) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          // @ts-expect-error compat
          message: `Error calling computer_call with action ${JSON.stringify(toolCall.computer_call.action)}: No image in content`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        // @ts-expect-error compat
        output: `Error calling computer_call with action ${JSON.stringify(toolCall.computer_call.action)}: No image in content`,
      }
    }

    const acknowledgedSafetyChecks =
      // @ts-expect-error compat
      toolCall.computer_call.pending_safety_checks.map((psc) => ({
        id: psc.id,
      }))

    return {
      tool_call_id: toolCall.id,
      output: serializeOutput({
        imageUrl,
        assistant,
      }),
      acknowledged_safety_checks: acknowledgedSafetyChecks,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 500,
        // @ts-expect-error compat
        message: `Error calling computer_call with action ${JSON.stringify(toolCall.computer_call.action)}: ${e.message}`,
        workspaceId: assistant.workspaceId,
        assistantId: assistant.id,
        threadId: thread.id,
      },
      prisma,
    })

    return {
      tool_call_id: toolCall.id,
      // @ts-expect-error compat
      output: `Error calling computer_call with action ${JSON.stringify(toolCall.computer_call.action)}: ${e.message}`,
    }
  }
}
