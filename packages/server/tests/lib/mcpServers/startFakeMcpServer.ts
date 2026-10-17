import {
  createServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
} from 'node:http'
import type { AddressInfo } from 'node:net'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js'

export type FakeMcpToolCall = {
  name: string
  arguments: Record<string, unknown> | undefined
}

export type FakeMcpBehavior = {
  tools: Tool[]
  callTool: (args: FakeMcpToolCall) => CallToolResult | Promise<CallToolResult>
  // When set, every HTTP request is answered with this status (server "down").
  failStatus: number | null
  // When set, tools/list fails with this JSON-RPC error message.
  listToolsError: string | null
}

export type FakeMcpHttpRequest = {
  method: string
  path: string
  headers: IncomingHttpHeaders
}

const readJson = async ({ req }: { req: IncomingMessage }) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return undefined
  return JSON.parse(raw)
}

// A real MCP server (low-level SDK Server) on a local port exposing both the
// Streamable HTTP transport (`/mcp`) and the legacy SSE transport (`/sse` +
// `/messages`). Tests can mutate `behavior` between requests.
export const startFakeMcpServer = async ({
  tools = [],
  callTool = ({ name }) => ({
    content: [{ type: 'text', text: `called ${name}` }],
  }),
}: {
  tools?: Tool[]
  callTool?: FakeMcpBehavior['callTool']
} = {}) => {
  const behavior: FakeMcpBehavior = {
    tools,
    callTool,
    failStatus: null,
    listToolsError: null,
  }
  const requests: FakeMcpHttpRequest[] = []
  const toolCalls: FakeMcpToolCall[] = []
  const sseTransports = new Map<string, SSEServerTransport>()
  // Legacy SSE clients hold a GET /sse stream open until they disconnect.
  const sseStreams = { opened: 0, closed: 0 }

  const buildMcpServer = () => {
    const server = new Server(
      { name: 'fake-mcp-server', version: '1.0.0' },
      { capabilities: { tools: {} } },
    )

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      if (behavior.listToolsError) throw new Error(behavior.listToolsError)
      return { tools: behavior.tools }
    })

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolCall = {
        name: request.params.name,
        arguments: request.params.arguments,
      }
      toolCalls.push(toolCall)
      return behavior.callTool(toolCall)
    })

    return server
  }

  const httpServer = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    requests.push({
      method: req.method ?? 'GET',
      path: url.pathname,
      headers: req.headers,
    })

    if (behavior.failStatus) {
      res.writeHead(behavior.failStatus, { 'content-type': 'text/plain' })
      res.end('MCP server unavailable')
      return
    }

    if (url.pathname === '/mcp') {
      if (req.method !== 'POST') {
        res.writeHead(405, { Allow: 'POST' })
        res.end()
        return
      }

      const body = await readJson({ req })
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      })
      const server = buildMcpServer()
      res.on('close', () => {
        transport.close()
        server.close()
      })
      await server.connect(transport)
      await transport.handleRequest(req, res, body)
      return
    }

    if (url.pathname === '/sse' && req.method === 'GET') {
      const transport = new SSEServerTransport('/messages', res)
      sseTransports.set(transport.sessionId, transport)
      sseStreams.opened += 1
      res.on('close', () => {
        sseStreams.closed += 1
        sseTransports.delete(transport.sessionId)
      })
      await buildMcpServer().connect(transport)
      return
    }

    if (url.pathname === '/messages' && req.method === 'POST') {
      const transport = sseTransports.get(url.searchParams.get('sessionId')!)
      if (!transport) {
        res.writeHead(404)
        res.end('Unknown session')
        return
      }
      await transport.handlePostMessage(req, res, await readJson({ req }))
      return
    }

    res.writeHead(404)
    res.end()
  })

  await new Promise<void>((resolve) =>
    httpServer.listen(0, '127.0.0.1', resolve),
  )
  const { port } = httpServer.address() as AddressInfo
  const origin = `http://127.0.0.1:${port}`

  return {
    origin,
    httpUrl: `${origin}/mcp`,
    sseUrl: `${origin}/sse`,
    behavior,
    requests,
    toolCalls,
    sseStreams,
    close: () =>
      new Promise<void>((resolve) => {
        httpServer.closeAllConnections()
        httpServer.close(() => resolve())
      }),
  }
}
