import type { Prisma } from '@prisma/client'

// Everything an assistant run needs: the model provider plus the tools,
// functions and MCP servers its tool calls are handled with.
export const assistantRunInclude = {
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
} satisfies Prisma.AssistantInclude
