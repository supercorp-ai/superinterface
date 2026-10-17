import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Readable } from 'node:stream'

export const FAKE_OPENAI_API_KEY_PREFIX = 'e2e-fake-openai:'

const OPENAI_BASE_URL = 'https://api.openai.com/v1'

const readBody = async ({ req }: { req: IncomingMessage }) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks)
}

const upstreamBaseUrl = ({ req }: { req: IncomingMessage }) => {
  const apiKey = (req.headers.authorization ?? '').replace(/^Bearer /, '')
  if (!apiKey.startsWith(FAKE_OPENAI_API_KEY_PREFIX)) return OPENAI_BASE_URL

  return apiKey.slice(FAKE_OPENAI_API_KEY_PREFIX.length)
}

// The server process reads OPENAI_BASE_URL once at startup, so it points at
// this router for the whole run. A request whose API key is
// `e2e-fake-openai:<baseURL>` goes to the fake OpenAI at `baseURL`, which lets
// each test pick its own fake through its OpenAI model provider's API key.
// Every other request goes on to the real OpenAI API untouched.
export const startOpenaiRouter = async () => {
  const server = createServer(async (req, res) => {
    const path = (req.url ?? '/').replace(/^\/v1/, '')
    const body = await readBody({ req })
    const headers = Object.fromEntries(
      Object.entries(req.headers).filter(
        ([name]) =>
          ![
            'host',
            'connection',
            'content-length',
            'transfer-encoding',
          ].includes(name),
      ),
    ) as Record<string, string>

    try {
      const response = await fetch(`${upstreamBaseUrl({ req })}${path}`, {
        method: req.method,
        headers,
        body: ['GET', 'HEAD'].includes(req.method ?? 'GET')
          ? undefined
          : new Uint8Array(body),
      })

      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, name) => {
        if (['content-encoding', 'content-length'].includes(name)) return
        responseHeaders[name] = value
      })
      res.writeHead(response.status, responseHeaders)

      if (!response.body) {
        res.end()
        return
      }

      // A fake that closes mid-response (e.g. a test ending) must only end
      // this response, not crash the vitest process the router runs in.
      const responseBody = Readable.fromWeb(response.body as never)
      responseBody.on('error', () => res.destroy())
      responseBody.pipe(res)
    } catch {
      res.destroy()
    }
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
