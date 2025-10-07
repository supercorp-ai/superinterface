import type { Prisma, Thread, Assistant } from '@prisma/client'
import { TransportType } from '@prisma/client'
import { EventSource } from 'eventsource'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { McpConnection } from '@/types'
import { headers as getHeaders } from '@/lib/mcpServers/headers'
import { url as getUrl } from '@/lib/mcpServers/url'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(global as any).EventSource = EventSource

const fetchWithHeaders =
  ({ headers }: { headers: Record<string, string> }) =>
  (url: string | URL, init?: RequestInit) => {
    const fetchHeaders = new Headers({
      ...(init?.headers ?? {}),
      ...headers,
    })

    return fetch(url.toString(), {
      ...init,
      headers: fetchHeaders,
    })
  }

export const getTransport = ({
  mcpServer,
  thread,
  assistant,
}: {
  mcpServer: Prisma.McpServerGetPayload<{
    include: {
      stdioTransport: true
      httpTransport: true
      sseTransport: true
    }
  }>
  thread: Thread
  assistant: Assistant
}) => {
  if (mcpServer.transportType === TransportType.STDIO) {
    throw new Error('STDIO transport is not supported.')
  }

  if (mcpServer.transportType === TransportType.HTTP) {
    const headers = getHeaders({
      thread,
      mcpServer,
      assistant,
    })
    const url = getUrl({ thread, mcpServer, assistant })

    return new StreamableHTTPClientTransport(new URL(url), {
      requestInit: {
        headers,
      },
    })
  }

  if (mcpServer.transportType === TransportType.SSE) {
    const url = getUrl({ thread, mcpServer, assistant })

    const headers = getHeaders({
      thread,
      mcpServer,
      assistant,
    })

    return new SSEClientTransport(new URL(url), {
      eventSourceInit: {
        fetch: fetchWithHeaders({ headers }),
      },
      requestInit: {
        headers,
      },
    })
  }

  throw new Error(`Unknown transport type ${mcpServer.transportType}`)
}

export const connectMcpServer = async ({
  mcpServer,
  thread,
  assistant,
}: {
  mcpServer: Prisma.McpServerGetPayload<{
    include: {
      stdioTransport: true
      httpTransport: true
      sseTransport: true
    }
  }>
  thread: Thread
  assistant: Assistant
}) => {
  const client = new Client(
    {
      name: 'superinterface-mcp-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    },
  )

  const transport = getTransport({ mcpServer, thread, assistant })
  await client.connect(transport)

  return {
    mcpConnection: {
      client,
      transport,
    } as McpConnection,
  }
}
