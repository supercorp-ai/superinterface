import type { Prisma } from '@prisma/client'

// Everything assistantClientAdapter needs to build a client for an assistant.
export const assistantClientInclude = {
  modelProvider: true,
  tools: {
    include: {
      fileSearchTool: true,
      webSearchTool: true,
      imageGenerationTool: true,
      codeInterpreterTool: true,
      computerUseTool: true,
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
  functions: true,
} satisfies Prisma.AssistantInclude
