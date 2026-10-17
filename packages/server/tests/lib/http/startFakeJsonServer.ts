import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'

export type FakeHttpRequest = {
  method: string
  path: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
}

export type FakeHttpResponse = {
  status: number
  json: unknown
}

const readBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return null
  return JSON.parse(raw)
}

// A minimal JSON HTTP server whose responses are decided by `handle`.
export const startFakeJsonServer = async ({
  handle,
}: {
  handle: (request: FakeHttpRequest) => FakeHttpResponse
}) => {
  const requests: FakeHttpRequest[] = []

  const server = createServer(async (req, res) => {
    const request = {
      method: req.method ?? 'GET',
      path: new URL(req.url ?? '/', 'http://localhost').pathname,
      body: await readBody(req),
    }
    requests.push(request)

    const { status, json } = handle(request)
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(json))
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    baseURL: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
