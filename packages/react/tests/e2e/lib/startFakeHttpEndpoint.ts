import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'

type EndpointReply = { status?: number; json: unknown }

// A local HTTP endpoint for REQUEST function handlers. Each request waits for
// `hold` (if set) and is answered by `reply`; requests are recorded.
export const startFakeHttpEndpoint = async ({
  reply,
}: {
  reply: (args: { request: IncomingMessage }) => EndpointReply
}) => {
  const requests: { method: string; url: string }[] = []
  let hold: Promise<unknown> | null = null
  let onRequest: () => void = () => {}

  const server = createServer(async (req, res) => {
    requests.push({ method: req.method ?? 'GET', url: req.url ?? '/' })
    onRequest()
    if (hold) await hold

    const { status = 200, json } = reply({ request: req })
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(json))
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    // Holds every request until the returned function is called, and resolves
    // `received` once a held request arrives.
    holdRequests: () => {
      let release: () => void = () => {}
      hold = new Promise<void>((resolve) => {
        release = resolve
      })
      const received = new Promise<void>((resolve) => {
        onRequest = resolve
      })

      return {
        received,
        release: () => {
          hold = null
          release()
        },
      }
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
