import { createServer, request as httpRequest } from 'node:http'
import type { AddressInfo } from 'node:net'

export type ProxiedRequest = {
  method: string
  path: string
  headers: Record<string, string>
  body: Buffer
}

type Responder = (args: { request: ProxiedRequest }) => {
  status: number
  json: unknown
}

// A transparent HTTP proxy in front of `target` (the test server or a fake
// LLM) that records every request. Requests whose path ends with a held
// suffix (and match its method and `when`, if given) wait until `release()`,
// so a test can look at the UI while a request is pending. A `midStream`
// hold forwards the request and the first server-sent event of its
// response, and holds the rest instead. `fail` drops the next matching
// request's connection, and `respond` answers matching requests itself
// instead of forwarding them.
export const startHeldProxy = async ({ target }: { target: string }) => {
  const requests: ProxiedRequest[] = []
  const holds: Array<{
    path: string
    method?: string
    when?: (args: { request: ProxiedRequest }) => boolean
    midStream?: boolean
  }> = []
  const failingPaths = new Set<string>()
  const responders = new Map<string, Responder>()
  let pending: Array<() => void> = []

  const matching = ({
    paths,
    path,
  }: {
    paths: Iterable<string>
    path: string
  }) => Array.from(paths).find((suffix) => path.endsWith(suffix))

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', target)
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    const request = {
      method: req.method ?? 'GET',
      path: url.pathname,
      headers: req.headers as Record<string, string>,
      body: Buffer.concat(chunks),
    }
    requests.push(request)

    const failingPath = matching({ paths: failingPaths, path: url.pathname })
    if (failingPath) {
      failingPaths.delete(failingPath)
      req.socket.destroy()
      return
    }

    const hold = holds.find(
      ({ path, method, when }) =>
        url.pathname.endsWith(path) &&
        (!method || method === request.method) &&
        (!when || when({ request })),
    )
    const waitForRelease = () =>
      new Promise<void>((resolve) => pending.push(resolve))

    if (hold && !hold.midStream) await waitForRelease()

    const responderPath = matching({
      paths: responders.keys(),
      path: url.pathname,
    })
    if (responderPath) {
      const { status, json } = responders.get(responderPath)!({ request })
      res.writeHead(status, {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
      })
      res.end(JSON.stringify(json))
      return
    }

    const upstreamRequest = httpRequest(
      url,
      { method: request.method, headers: { ...req.headers, host: url.host } },
      async (upstream) => {
        res.writeHead(upstream.statusCode ?? 502, upstream.headers)
        if (!hold?.midStream) return upstream.pipe(res)

        // Send the first server-sent event, then hold the rest.
        const upstreamChunks: Buffer[] = []
        for await (const chunk of upstream) upstreamChunks.push(chunk as Buffer)
        const body = Buffer.concat(upstreamChunks).toString()
        const firstEventEnd = body.indexOf('\n\n') + 2
        res.write(body.slice(0, firstEventEnd))
        await waitForRelease()
        res.end(body.slice(firstEventEnd))
      },
    )
    upstreamRequest.on('error', () => res.destroy())
    upstreamRequest.end(request.body)
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  const release = () => {
    holds.length = 0
    pending.forEach((resolve) => resolve())
    pending = []
  }

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    hold: (hold: (typeof holds)[number]) => {
      holds.push(hold)
    },
    fail: ({ path }: { path: string }) => {
      failingPaths.add(path)
    },
    respond: ({ path, handle }: { path: string; handle: Responder }) => {
      responders.set(path, handle)
    },
    release,
    pendingCount: () => pending.length,
    close: () =>
      new Promise<void>((resolve) => {
        release()
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
