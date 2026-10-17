import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { FirecrawlHandler } from '@prisma/client'
import { startTestHttpServer } from '../../../http/startTestHttpServer'
import { redirectGlobalFetch } from '../../../http/redirectGlobalFetch'

test('searchFirecrawl posts the handler body merged with the args to the Firecrawl search API', async () => {
  const firecrawl = await startTestHttpServer({
    handle: ({ res }) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ success: true, data: [] }))
    },
  })
  const redirect = redirectGlobalFetch({
    from: 'https://api.firecrawl.dev',
    to: firecrawl.url,
  })

  try {
    // Imported inside the test so the module's own statements are
    // attributed to the test that checks them.
    const { searchFirecrawl } = await import(
      '@/lib/functions/handleFunction/firecrawl/searchFirecrawl'
    )

    const result = await searchFirecrawl({
      firecrawlHandler: {
        apiKey: 'fc-test',
        body: { limit: '3', query: 'default' },
      } as unknown as FirecrawlHandler,
      args: { query: 'superinterface' },
    })

    assert.deepEqual(result, { success: true, data: [] })
    const [request] = firecrawl.requests
    assert.equal(request.method, 'POST')
    assert.equal(request.path, '/v0/search')
    assert.equal(request.headers.authorization, 'Bearer fc-test')
    assert.equal(request.headers['content-type'], 'application/json')
    assert.deepEqual(JSON.parse(request.rawBody), {
      limit: '3',
      query: 'superinterface',
    })
  } finally {
    redirect.restore()
    await firecrawl.close()
  }
})
