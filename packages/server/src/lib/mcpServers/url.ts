import type { Thread, Assistant, PrismaClient } from '@prisma/client'
import type { RemoteMcpServer } from './remoteMcpServer'
import { transportSetting } from './transportSetting'
import { interpolateMcpServerValues } from './interpolateMcpServerValues'

// The server's transport URL with its {{variable}} templates filled in.
export const url = ({
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
  const values = interpolateMcpServerValues({
    values: {
      url: transportSetting({ mcpServer, field: 'url', fallback: '' }),
    },
    thread,
    assistant,
    prisma,
  })

  return values.url
}
