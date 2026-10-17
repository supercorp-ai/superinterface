import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import type { AddressInfo } from 'node:net'

export type FakeHttpRequest = {
  method: string
  path: string
  search: string
  headers: IncomingMessage['headers']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
}

export type FakeHttpReply =
  | { status?: number; json: unknown }
  | { status?: number; sse: { event?: string; data: unknown }[] }
  | { status?: number; text: string }

const readBody = async ({ req }: { req: IncomingMessage }) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

const writeReply = ({
  res,
  reply,
}: {
  res: ServerResponse
  reply: FakeHttpReply
}) => {
  const status = reply.status ?? 200

  if ('sse' in reply) {
    res.writeHead(status, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
    })
    for (const { event, data } of reply.sse) {
      if (event) res.write(`event: ${event}\n`)
      const payload = typeof data === 'string' ? data : JSON.stringify(data)
      res.write(`data: ${payload}\n\n`)
    }
    res.end()
    return
  }

  if ('text' in reply) {
    res.writeHead(status, { 'content-type': 'text/plain' })
    res.end(reply.text)
    return
  }

  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(reply.json))
}

// A local HTTP server standing in for a provider API. `respond` maps each
// recorded request to a reply; unmatched requests get a 404 JSON error.
export const startFakeHttpServer = async ({
  respond,
}: {
  respond: (args: { request: FakeHttpRequest }) => FakeHttpReply | null
}) => {
  const requests: FakeHttpRequest[] = []

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const request = {
      method: req.method ?? 'GET',
      path: url.pathname,
      search: url.search,
      headers: req.headers,
      body: await readBody({ req }),
    }
    requests.push(request)

    const reply = respond({ request }) ?? {
      status: 404,
      json: {
        error: { message: `Unhandled ${request.method} ${url.pathname}` },
      },
    }
    writeReply({ res, reply })
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    origin: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
