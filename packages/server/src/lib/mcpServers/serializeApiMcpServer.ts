import type { Prisma, SseTransport, HttpTransport } from '@prisma/client'

const serializeApiSseTransport = ({
  sseTransport,
}: {
  sseTransport: SseTransport
}) => ({
  id: sseTransport.id,
  url: sseTransport.url,
  headers: sseTransport.headers,
  createdAt: sseTransport.createdAt.toISOString(),
  updatedAt: sseTransport.updatedAt.toISOString(),
})

const serializeApiHttpTransport = ({
  httpTransport,
}: {
  httpTransport: HttpTransport
}) => ({
  id: httpTransport.id,
  url: httpTransport.url,
  headers: httpTransport.headers,
  createdAt: httpTransport.createdAt.toISOString(),
  updatedAt: httpTransport.updatedAt.toISOString(),
})

export const serializeApiMcpServer = ({
  mcpServer,
}: {
  mcpServer: Prisma.McpServerGetPayload<{
    include: {
      sseTransport: true
      httpTransport: true
    }
  }>
}) => ({
  id: mcpServer.id,
  transportType: mcpServer.transportType,
  sseTransport: mcpServer.sseTransport
    ? serializeApiSseTransport({
        sseTransport: mcpServer.sseTransport,
      })
    : null,
  httpTransport: mcpServer.httpTransport
    ? serializeApiHttpTransport({
        httpTransport: mcpServer.httpTransport,
      })
    : null,
  createdAt: mcpServer.createdAt.toISOString(),
  updatedAt: mcpServer.updatedAt.toISOString(),
})
