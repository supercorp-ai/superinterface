import OpenAI from 'openai'
import { Prisma, Thread, PrismaClient } from '@prisma/client'
import type { McpConnection } from '@/types'
import { findMcpServerTool } from './findMcpServerTool'

const lastFailure = ({ failures }: { failures: Error[] }) =>
  failures.at(-1) ?? null

type ToolCallMcpServer = {
  // The open connection to the first server with the tool.
  mcpConnection: McpConnection | undefined
  // The last failure connecting to or listing the tools of a server.
  error: Error | null
}

// Finds the first of the assistant's MCP servers with the called tool.
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
}): Promise<ToolCallMcpServer> => {
  const { name: toolName } = toolCall.function
  const failures: Error[] = []

  for (const mcpServer of assistant.mcpServers) {
    const lookup = await findMcpServerTool({
      mcpServer,
      toolName,
      thread,
      assistant,
      prisma,
    })

    if (lookup.outcome === 'found') {
      return {
        mcpConnection: lookup.mcpConnection,
        error: lastFailure({ failures }),
      }
    }

    if (lookup.outcome === 'failed') {
      failures.push(lookup.error)
    }
  }

  return { mcpConnection: undefined, error: lastFailure({ failures }) }
}
