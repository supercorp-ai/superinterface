import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const distDir = path.resolve(__dirname, '../../../dist')

const contentTypes: Record<string, string> = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.map': 'application/json',
}

// `/script-tags/<Bundle>~<id>` serves dist/<Bundle>.global.js, the way the
// hosted script tag route serves an embed under its script tag id.
const filePath = ({ pathname }: { pathname: string }) => {
  const scriptTag = pathname.match(/^\/script-tags\/([A-Za-z]+)~/)
  if (scriptTag) return path.join(distDir, `${scriptTag[1]}.global.js`)

  const dist = pathname.match(/^\/dist\/([\w.-]+)$/)
  if (dist) return path.join(distDir, dist[1])

  return null
}

const readBody = async ({ req }: { req: IncomingMessage }) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

// Serves the built embeds like a CDN would, and customer pages: a test
// POSTs the page's HTML to `/pages` and gets the page's URL back.
export const startStaticServer = async () => {
  const pages = new Map<string, string>()

  const server = createServer(async (req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost')

    if (req.method === 'POST' && pathname === '/pages') {
      const id = randomUUID()
      pages.set(`/pages/${id}.html`, await readBody({ req }))
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.end(`/pages/${id}.html`)
      return
    }

    const pageHtml = pages.get(pathname)
    if (pageHtml) {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(pageHtml)
      return
    }

    const file = filePath({ pathname })
    const body = file ? await readFile(file).catch(() => null) : null

    if (!file || !body) {
      res.writeHead(404)
      res.end()
      return
    }

    res.writeHead(200, {
      'content-type': contentTypes[path.extname(file)] ?? 'text/plain',
      'access-control-allow-origin': '*',
    })
    res.end(body)
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
