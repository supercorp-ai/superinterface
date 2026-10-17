import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'
import { randomUUID } from 'node:crypto'

type PublishOverride = {
  // Message id to return instead of a generated one (may be malformed).
  messageId?: unknown
  // Runs before QStash answers, e.g. to simulate a concurrent request.
  beforeRespond?: () => Promise<void> | void
}

export type FakeQstashPublish = {
  messageId: string
  destination: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
  headers: Record<string, string>
}

const readBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

const parseJson = ({ raw }: { raw: string }) => {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

const headersRecord = ({ req }: { req: IncomingMessage }) =>
  Object.fromEntries(
    Object.entries(req.headers).map(([name, value]) => [
      name.toLowerCase(),
      Array.isArray(value) ? value.join(', ') : (value ?? ''),
    ]),
  )

// A local stand-in for the QStash REST API. Set `QSTASH_URL` to `baseURL`
// before `@/lib/upstash/qstash` is imported so the real SDK client talks to it.
export const startFakeQstash = async () => {
  const publishes: FakeQstashPublish[] = []
  const deletes: string[] = []
  let deleteStatus = 200
  let publishStatus = 200
  const publishOverrides: PublishOverride[] = []

  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(
      new URL(req.url ?? '/', 'http://localhost').pathname,
    )
    const raw = await readBody(req)

    if (req.method === 'POST' && path.startsWith('/v2/publish/')) {
      if (publishStatus !== 200) {
        res.writeHead(publishStatus, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: 'publish failed' }))
        return
      }

      const override = publishOverrides.shift() ?? {}
      const messageId = override.messageId ?? `msg_${randomUUID()}`
      publishes.push({
        messageId: String(messageId),
        destination: path.slice('/v2/publish/'.length),
        body: parseJson({ raw }),
        headers: headersRecord({ req }),
      })
      await override.beforeRespond?.()
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ messageId }))
      return
    }

    if (req.method === 'DELETE' && path.startsWith('/v2/messages/')) {
      deletes.push(path.slice('/v2/messages/'.length))
      res.writeHead(deleteStatus, { 'content-type': 'application/json' })
      res.end(deleteStatus === 200 ? '' : JSON.stringify({ error: 'failed' }))
      return
    }

    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: `Unhandled ${req.method} ${path}` }))
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    baseURL: `http://127.0.0.1:${port}`,
    publishes,
    deletes,
    setDeleteStatus: ({ status }: { status: number }) => {
      deleteStatus = status
    },
    setPublishStatus: ({ status }: { status: number }) => {
      publishStatus = status
    },
    overrideNextPublish: (override: PublishOverride) => {
      publishOverrides.push(override)
    },
    reset: () => {
      publishOverrides.length = 0
      publishes.length = 0
      deletes.length = 0
      deleteStatus = 200
      publishStatus = 200
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
