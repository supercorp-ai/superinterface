import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

// An HTTP server that answers every request with `json`, but only once
// `release()` is called, so a test can look at the app while it waits.
export const startHeldJsonServer = async ({ json }: { json: unknown }) => {
  let release = () => {}
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  const requests: string[] = []

  const server = createServer(async (req, res) => {
    requests.push(req.url ?? '/')
    await released
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(json))
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    release,
    close: () =>
      new Promise<void>((resolve) => {
        release()
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
