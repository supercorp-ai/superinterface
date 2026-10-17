import { AssistantHandler, type PrismaClient } from '@prisma/client'

export const findHandlerAssistant = ({
  assistantHandler,
  prisma,
}: {
  assistantHandler: AssistantHandler
  prisma: PrismaClient
}) =>
  prisma.assistant.findUnique({
    where: {
      id: assistantHandler.assistantId,
    },
    include: {
      modelProvider: true,
      initialMessages: true,
      mcpServers: {
        include: {
          computerUseTool: true,
          stdioTransport: true,
          httpTransport: true,
          sseTransport: true,
        },
      },
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
            },
          },
        },
      },
    },
  })

export type HandlerAssistant = NonNullable<
  Awaited<ReturnType<typeof findHandlerAssistant>>
>
