import type { Prisma, Thread, Assistant, PrismaClient } from '@prisma/client'
import {
  LogRequestMethod,
  LogRequestRoute,
  LogLevel,
  TransportType,
} from '@prisma/client'
import { dash } from 'radash'
import { interpolateFunctionValue } from '@/lib/functions/interpolateFunctionValue'
import { createLog } from '@/lib/logs/createLog'

const transportHeaders = ({
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
    return mcpServer.httpTransport!.headers
  } else if (mcpServer.transportType === TransportType.SSE) {
    return mcpServer.sseTransport!.headers
  }

  return {}
}

const interpolatedTransportHeaders = ({
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
  const result: Record<string, string> = {}
  const missing: string[] = []

  for (const [k, v] of Object.entries(transportHeaders({ mcpServer }))) {
    const res = interpolateFunctionValue({
      value: v,
      args: metadata,
      thread,
      assistant,
    })
    result[k] = res.value
    missing.push(...res.missing)
  }

  return { headers: result, missing }
}

export const headers = ({
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
  const { headers, missing } = interpolatedTransportHeaders({
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

  const data = {
    ...headers,
    ...(thread.metadata ?? {}),
  }

  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [dash(key), value]),
  )
}
