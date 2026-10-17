import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'

const readJson = async ({ req }: { req: IncomingMessage }) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const encode = ({
  value,
  base64,
}: {
  value: string | null
  base64: boolean
}) => {
  if (value === null || !base64) return value
  return Buffer.from(value).toString('base64')
}

// A minimal Upstash Redis REST server supporting GET and SET, single or
// pipelined. Set UPSTASH_REDIS_REST_URL/TOKEN to `url`/`token` before
// `@/lib/redis` loads.
export const startFakeRedis = async () => {
  const store = new Map<string, string>()
  const commands: (string | number)[][] = []

  const execute = ({ command }: { command: (string | number)[] }) => {
    commands.push(command)
    const [name, key, value] = command.map(String)

    if (name.toLowerCase() === 'get') return store.get(key) ?? null
    if (name.toLowerCase() !== 'set') return null

    store.set(key, value)
    return 'OK'
  }

  const server = createServer(async (req, res) => {
    const body = await readJson({ req })
    const base64 = req.headers['upstash-encoding'] === 'base64'
    const respond = ({ command }: { command: (string | number)[] }) => ({
      result: encode({ value: execute({ command }), base64 }),
    })
    const isPipeline = Array.isArray(body[0])
    const payload = isPipeline
      ? body.map((command: (string | number)[]) => respond({ command }))
      : respond({ command: body })

    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(payload))
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    url: `http://127.0.0.1:${port}`,
    token: 'fake-upstash-token',
    store,
    commands,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
