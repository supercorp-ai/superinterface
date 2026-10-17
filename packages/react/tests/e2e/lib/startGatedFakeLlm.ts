import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'
import { randomUUID } from 'node:crypto'

const readBody = async ({ req }: { req: IncomingMessage }) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : null
}

// An OpenAI-compatible fake model that streams its reply in pieces and only
// moves on when the test calls `release()`: the first piece goes out right
// away, each later piece (and finally the end of the reply) waits for one
// release. This holds an assistant message `in_progress` mid-sentence.
export const startGatedFakeLlm = async ({ chunks }: { chunks: string[] }) => {
  const requests: { path: string; body: any }[] = []
  const waiting: (() => void)[] = []
  let released = 0

  const gate = () =>
    new Promise<void>((resolve) => {
      if (released > 0) {
        released -= 1
        resolve()
        return
      }
      waiting.push(resolve)
    })

  const server = createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname
    const body = await readBody({ req })
    requests.push({ path, body })

    if (req.method === 'GET' && path.endsWith('/models')) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          object: 'list',
          data: [{ id: 'fake-model', object: 'model', created: 0 }],
        }),
      )
      return
    }

    if (req.method !== 'POST' || !path.endsWith('/chat/completions')) {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: { message: `Unhandled ${path}` } }))
      return
    }

    const id = `chatcmpl-${randomUUID()}`
    const write = (delta: object, finishReason: string | null) =>
      res.write(
        `data: ${JSON.stringify({
          id,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: body?.model ?? 'fake-model',
          choices: [{ index: 0, delta, finish_reason: finishReason }],
        })}\n\n`,
      )

    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    })

    for (let index = 0; index < chunks.length; index++) {
      if (index > 0) await gate()
      const content = chunks[index]
      write(index === 0 ? { role: 'assistant', content } : { content }, null)
    }

    await gate()
    write({}, 'stop')
    res.end('data: [DONE]\n\n')
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    requests,
    release: () => {
      const next = waiting.shift()
      if (next) {
        next()
        return
      }
      released += 1
    },
    close: () =>
      new Promise<void>((resolve) => {
        waiting.splice(0).forEach((resolve) => resolve())
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
