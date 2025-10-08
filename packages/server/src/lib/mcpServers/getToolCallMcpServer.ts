import OpenAI from 'openai'
import { Prisma, Thread, PrismaClient } from '@prisma/client'
import { forEach } from 'p-iteration'
import { connectMcpServer } from '@/lib/mcpServers/connectMcpServer'
import type { McpConnection } from '@/types'
import { closeMcpConnection } from '@/lib/mcpServers/closeMcpConnection'

export const getToolCallMcpServer = async ({
  assistant,
  toolCall,
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
    }
  }>
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  thread: Thread
  prisma: PrismaClient
}) => {
  let mcpConnection: McpConnection | null = null

  await forEach(assistant.mcpServers, async (mcpServer) => {
    if (mcpConnection) return false

    const { mcpConnection: innerMcpConnection } = await connectMcpServer({
      mcpServer,
      thread,
      assistant,
      prisma,
    })

    const listToolsResponse =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (await innerMcpConnection.client.listTools()) as any

    const tool = listToolsResponse.tools.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tool: any) => tool.name === toolCall.function.name,
    )

    if (!tool) {
      await closeMcpConnection({
        mcpConnection: innerMcpConnection,
      })
      return false
    }

    mcpConnection = innerMcpConnection

    return true
  })

  return {
    mcpConnection: mcpConnection as McpConnection | null,
  }
}
