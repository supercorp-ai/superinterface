import type { Prisma, Thread, Assistant, PrismaClient } from '@prisma/client'
import {
  LogRequestMethod,
  LogRequestRoute,
  LogLevel,
  TransportType,
} from '@prisma/client'
import { interpolateFunctionValue } from '@/lib/functions/interpolateFunctionValue'
import { createLog } from '@/lib/logs/createLog'

const transportUrl = ({
  mcpServer,
}: {
  mcpServer: Prisma.McpServerGetPayload<{
    include: {
      httpTransport: true
      sseTransport: true
    }
  }>
}) => {
  if (mcpServer.transportType === TransportType.HTTP) {
    return mcpServer.httpTransport!.url
  } else if (mcpServer.transportType === TransportType.SSE) {
    return mcpServer.sseTransport!.url
  }

  return ''
}

const interpolatedTransportUrl = ({
  mcpServer,
  thread,
  metadata,
  assistant,
}: {
  mcpServer: Prisma.McpServerGetPayload<{
    include: {
      httpTransport: true
      sseTransport: true
    }
  }>
  thread: Thread
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
  assistant: Assistant
}) => {
  const { value, missing } = interpolateFunctionValue({
    value: transportUrl({ mcpServer }),
    args: metadata,
    thread,
    assistant,
  })

  return { url: value, missing }
}

export const url = ({
  thread,
  mcpServer,
  assistant,
  prisma,
}: {
  thread: Thread
  mcpServer: Prisma.McpServerGetPayload<{
    include: {
      httpTransport: true
      sseTransport: true
    }
  }>
  assistant: Assistant
  prisma: PrismaClient
}) => {
  const { url, missing } = interpolatedTransportUrl({
    mcpServer,
    thread,
    metadata: thread.metadata ?? {},
    assistant,
  })

  if (missing.length) {
    const message = `Missing variables in MCP server: ${missing.join(', ')}`

    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 400,
        message,
        workspaceId: assistant.workspaceId,
        assistantId: assistant.id,
        threadId: thread.id,
      },
      prisma,
    })

    throw new Error(message)
  }

  return url
}
