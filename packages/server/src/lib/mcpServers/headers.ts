import type { Thread, Assistant, PrismaClient } from '@prisma/client'
import { dash } from 'radash'
import type { RemoteMcpServer } from './remoteMcpServer'
import { transportSetting } from './transportSetting'
import { interpolateMcpServerValues } from './interpolateMcpServerValues'

// The server's transport headers with their {{variable}} templates filled
// in, followed by the thread's metadata, all with dashed names.
export const headers = ({
  thread,
  mcpServer,
  assistant,
  prisma,
}: {
  thread: Thread
  mcpServer: RemoteMcpServer
  assistant: Assistant
  prisma: PrismaClient
}) => {
  const transportHeaders = interpolateMcpServerValues({
    values: transportSetting({ mcpServer, field: 'headers', fallback: {} }),
    thread,
    assistant,
    prisma,
  })

  const data = {
    ...transportHeaders,
    ...(thread.metadata ?? {}),
  }

  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [dash(key), value]),
  )
}
