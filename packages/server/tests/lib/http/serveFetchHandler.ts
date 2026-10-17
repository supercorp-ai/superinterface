import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'

const readBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks)
}

// Serves a fetch-style handler (Request => Response), such as a Next.js route
// handler, on a real local port so other components can call it over HTTP.
export const serveFetchHandler = async ({
  handler,
}: {
  handler: (request: Request) => Promise<Response>
}) => {
  const responses: Array<{ status: number; body: string }> = []

  const server = createServer(async (req, res) => {
    const body = await readBody(req)
    const headers = new Headers()
    for (const [name, value] of Object.entries(req.headers)) {
      if (value === undefined) continue
      headers.set(name, Array.isArray(value) ? value.join(', ') : value)
    }

    const response = await handler(
      new Request(new URL(req.url ?? '/', 'http://127.0.0.1'), {
        method: req.method,
        headers,
        ...(body.length ? { body } : {}),
      }),
    )
    const text = await response.text()
    responses.push({ status: response.status, body: text })

    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(text)
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    url: `http://127.0.0.1:${port}`,
    responses,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
