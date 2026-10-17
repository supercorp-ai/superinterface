import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'

type RedisValue = string | number | null
type Command = RedisValue[]

const readBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return null
  return JSON.parse(raw)
}

const encode = ({
  value,
  base64,
}: {
  value: unknown
  base64: boolean
}): unknown => {
  if (!base64) return value
  if (typeof value === 'string') return Buffer.from(value).toString('base64')
  if (Array.isArray(value))
    return value.map((v) => encode({ value: v, base64 }))
  return value
}

// A local stand-in for the Upstash Redis REST API. Set
// `UPSTASH_REDIS_REST_URL` to `baseURL` (and any token) before `@/lib/redis`
// is imported so the real SDK client talks to it. Supports the commands the
// server uses: set (nx/ex), get, del and the lock-release eval script.
export const startFakeRedisWithLocks = async () => {
  const store = new Map<string, string>()
  const commands: Command[] = []

  const run = ({ command }: { command: Command }): unknown => {
    commands.push(command)
    const [name, ...args] = command
    const op = String(name).toLowerCase()

    if (op === 'set') {
      const [key, value, ...options] = args
      const flags = options.map((option) => String(option).toLowerCase())
      if (flags.includes('nx') && store.has(String(key))) return null
      store.set(String(key), String(value))
      return 'OK'
    }

    if (op === 'get') {
      return store.get(String(args[0])) ?? null
    }

    if (op === 'del') {
      return args.filter((key) => store.delete(String(key))).length
    }

    if (op === 'eval') {
      const [, numKeys, ...rest] = args
      const keys = rest.slice(0, Number(numKeys)).map(String)
      const [token] = rest.slice(Number(numKeys)).map(String)
      if (store.get(keys[0]) !== token) return 0
      store.delete(keys[0])
      return 1
    }

    throw new Error(`Unsupported fake redis command: ${op}`)
  }

  const server = createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname
    const body = await readBody(req)
    const base64 = req.headers['upstash-encoding'] === 'base64'

    res.writeHead(200, { 'content-type': 'application/json' })

    if (path === '/pipeline' || path === '/multi-exec') {
      res.end(
        JSON.stringify(
          (body as Command[]).map((command) => ({
            result: encode({ value: run({ command }), base64 }),
          })),
        ),
      )
      return
    }

    res.end(
      JSON.stringify({
        result: encode({ value: run({ command: body as Command }), base64 }),
      }),
    )
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    baseURL: `http://127.0.0.1:${port}`,
    store,
    commands,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
