import { createServer as createHttpServer } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import { connect, type AddressInfo, type Socket } from 'node:net'
import { createSelfSignedCert } from './createSelfSignedCert'
import type { TestHttpRequest } from './startTestHttpServer'

export type FakeHttpsRequest = TestHttpRequest & { host: string }

type Reply = { status: number; body: unknown }

// An HTTP proxy that tunnels every CONNECT to one local HTTPS server with a
// self-signed certificate. Point HTTPS_PROXY at `proxyUrl` (and disable TLS
// verification) to answer for hardcoded https hosts, e.g. Azure SDK clients
// whose pipelines honor HTTPS_PROXY.
export const startFakeHttpsProxy = async ({
  handle,
}: {
  handle: (args: { request: FakeHttpsRequest }) => Reply
}) => {
  const requests: FakeHttpsRequest[] = []

  const https = createHttpsServer(createSelfSignedCert(), async (req, res) => {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    const url = new URL(req.url ?? '/', 'https://localhost')

    const request = {
      host: req.headers.host ?? '',
      method: req.method ?? 'GET',
      path: url.pathname,
      query: url.searchParams,
      headers: req.headers,
      rawBody: Buffer.concat(chunks).toString('utf8'),
    }
    requests.push(request)

    const { status, body } = handle({ request })
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(body))
  })

  await new Promise<void>((resolve) => https.listen(0, '127.0.0.1', resolve))
  const httpsPort = (https.address() as AddressInfo).port

  // Tunnels are detached from the proxy, so track them to close them.
  const tunnels = new Set<Socket>()
  const proxy = createHttpServer()
  proxy.on('connect', (_req, clientSocket: Socket, head) => {
    const serverSocket = connect(httpsPort, '127.0.0.1', () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
      serverSocket.write(head)
      serverSocket.pipe(clientSocket)
      clientSocket.pipe(serverSocket)
    })
    tunnels.add(clientSocket).add(serverSocket)
    serverSocket.on('close', () => tunnels.delete(serverSocket))
    clientSocket.on('close', () => tunnels.delete(clientSocket))
    serverSocket.on('error', () => clientSocket.destroy())
    clientSocket.on('error', () => serverSocket.destroy())
  })

  await new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve))
  const proxyPort = (proxy.address() as AddressInfo).port

  return {
    proxyUrl: `http://127.0.0.1:${proxyPort}`,
    requests,
    close: async () => {
      for (const socket of tunnels) socket.destroy()
      proxy.closeAllConnections()
      https.closeAllConnections()
      await Promise.all([
        new Promise<void>((resolve) => proxy.close(() => resolve())),
        new Promise<void>((resolve) => https.close(() => resolve())),
      ])
    },
  }
}
