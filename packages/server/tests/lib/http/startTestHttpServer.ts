import {
  createServer,
  type IncomingHttpHeaders,
  type ServerResponse,
} from 'node:http'
import type { AddressInfo } from 'node:net'

export type TestHttpRequest = {
  method: string
  path: string
  query: URLSearchParams
  headers: IncomingHttpHeaders
  rawBody: string
}

type Handler = (args: {
  request: TestHttpRequest
  res: ServerResponse
}) => void | Promise<void>

// A local HTTP server that records every request and lets the test decide
// how to respond. Used to stand in for third-party endpoints that function
// handlers call out to.
export const startTestHttpServer = async ({ handle }: { handle: Handler }) => {
  const requests: TestHttpRequest[] = []

  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    const url = new URL(req.url ?? '/', 'http://localhost')

    const request = {
      method: req.method ?? 'GET',
      path: url.pathname,
      query: url.searchParams,
      headers: req.headers,
      rawBody: Buffer.concat(chunks).toString('utf8'),
    }
    requests.push(request)

    await handle({ request, res })
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
