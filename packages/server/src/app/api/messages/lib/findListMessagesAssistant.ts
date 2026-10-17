import type { Prisma, PrismaClient } from '@prisma/client'
import { threadsInclude } from './threadsInclude'

export const findListMessagesAssistant = ({
  prisma,
  assistantId,
  workspaceAccessWhere,
  threadId,
}: {
  prisma: PrismaClient
  assistantId: string
  workspaceAccessWhere: Prisma.WorkspaceWhereInput
  threadId: string | undefined
}) =>
  prisma.assistant.findFirst({
    where: {
      id: assistantId,
      workspace: workspaceAccessWhere,
    },
    include: {
      threads: threadsInclude({ threadId: threadId ?? null }),
      workspace: {
        include: {
          modelProviders: true,
        },
      },
      modelProvider: true,
      initialMessages: {
        orderBy: {
          orderNumber: 'desc',
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
      tools: {
        include: {
          fileSearchTool: true,
          webSearchTool: true,
          imageGenerationTool: true,
          codeInterpreterTool: true,
          computerUseTool: true,
        },
      },
      functions: true,
    },
  })
