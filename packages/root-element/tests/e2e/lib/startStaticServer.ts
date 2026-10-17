import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import type { AddressInfo } from 'node:net'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { embedScript } from './embedScript'

const distDir = path.resolve(__dirname, '../../../dist')

const readBody = async ({ req }: { req: IncomingMessage }) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

const send = ({
  res,
  contentType,
  body,
}: {
  res: ServerResponse
  contentType: string
  body: string | Buffer
}) => {
  res.writeHead(200, { 'content-type': contentType })
  res.end(body)
}

// Serves the package's build, an embed script at `/embed.js` and at the
// hosted script tag path `/script-tags/<id>`, and customer pages: a test
// POSTs the page's HTML to `/pages` and gets the page's URL back.
export const startStaticServer = async () => {
  const pages = new Map<string, string>()

  const server = createServer(async (req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost')

    if (req.method === 'POST' && pathname === '/pages') {
      const id = randomUUID()
      pages.set(`/pages/${id}.html`, await readBody({ req }))
      send({ res, contentType: 'text/plain', body: `/pages/${id}.html` })
      return
    }

    const page = pages.get(pathname)
    if (page) {
      send({ res, contentType: 'text/html', body: page })
      return
    }

    if (pathname === '/embed.js' || pathname.startsWith('/script-tags/')) {
      send({ res, contentType: 'text/javascript', body: await embedScript() })
      return
    }

    const dist = pathname.match(/^\/dist\/([\w.-]+)$/)
    const body = dist
      ? await readFile(path.join(distDir, dist[1])).catch(() => null)
      : null

    if (!body) {
      res.writeHead(404)
      res.end()
      return
    }

    send({ res, contentType: 'text/javascript', body })
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
