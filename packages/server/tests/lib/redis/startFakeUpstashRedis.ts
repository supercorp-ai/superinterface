import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

type Command = [string, ...unknown[]]

const encode = ({ value, base64 }: { value: unknown; base64: boolean }) => {
  if (typeof value !== 'string') return value
  if (!base64) return value
  return Buffer.from(value, 'utf8').toString('base64')
}

// A minimal in-memory implementation of the Upstash Redis REST protocol
// (GET/SET/DEL). Set UPSTASH_REDIS_REST_URL/TOKEN to `url`/`token` before the
// app's redis client is imported so it talks to this server.
export const startFakeUpstashRedis = async () => {
  const store = new Map<string, string>()
  const commands: Command[] = []

  const run = ({ command }: { command: Command }) => {
    const [name, key, value] = command
    const op = name.toLowerCase()

    if (op === 'get') return store.get(String(key)) ?? null
    if (op === 'set') {
      store.set(String(key), String(value))
      return 'OK'
    }
    if (op === 'del') {
      return command.slice(1).filter((k) => store.delete(String(k))).length
    }

    throw new Error(`Unsupported command ${name}`)
  }

  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    const base64 = req.headers['upstash-encoding'] === 'base64'
    const respond = ({ command }: { command: Command }) => {
      commands.push(command)
      try {
        return { result: encode({ value: run({ command }), base64 }) }
      } catch (e) {
        return { error: (e as Error).message }
      }
    }

    // Auto-pipelining sends `[[cmd, ...args], ...]` to /pipeline.
    const isPipeline = Array.isArray(body[0])
    const payload = isPipeline
      ? body.map((command: Command) => respond({ command }))
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
