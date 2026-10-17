import assert from 'node:assert'
import { after, before, describe, it } from 'node:test'
import {
  FirecrawlHandlerType,
  HandlerType,
  ReplicateHandlerType,
} from '@prisma/client'
import { createTestFunction } from '../../lib/functions/createTestFunction'
import { runFakeToolCalls } from '../../lib/functions/runFakeToolCalls'
import { startTestHttpServer } from '../../lib/http/startTestHttpServer'
import { redirectGlobalFetch } from '../../lib/http/redirectGlobalFetch'
import { waitForAssistantLog } from '../../lib/logs/waitForAssistantLog'
import { assertRunLog } from '../../lib/logs/assertRunLog'
import type { FakeLlmToolCall } from '../../lib/llm/startFakeLlm'

type Reply = { status: number; body: unknown }

const runFirecrawl = async ({
  type,
  args,
  body = {},
  apiKey = 'fc-test',
}: {
  type: FirecrawlHandlerType
  args: FakeLlmToolCall['arguments']
  body?: Record<string, unknown>
  apiKey?: string
}) =>
  runFakeToolCalls({
    toolCalls: [{ name: 'crawl_site', arguments: args }],
    setup: async ({ assistant }) => {
      await createTestFunction({
        assistantId: assistant.id,
        openapiSpec: { name: 'crawl_site', parameters: {} },
        handler: {
          type: HandlerType.FIRECRAWL,
          firecrawlHandler: {
            create: {
              type,
              apiKey,
              body: body as PrismaJson.FirecrawlHandlerBody,
            },
          },
        },
      })
    },
  })

const runReplicate = async ({
  args,
  identifier,
}: {
  args: FakeLlmToolCall['arguments']
  identifier: string
}) =>
  runFakeToolCalls({
    toolCalls: [{ name: 'make_image', arguments: args }],
    setup: async ({ assistant }) => {
      await createTestFunction({
        assistantId: assistant.id,
        openapiSpec: { name: 'make_image', parameters: {} },
        handler: {
          type: HandlerType.REPLICATE,
          replicateHandler: {
            create: {
              type: ReplicateHandlerType.RUN,
              identifier,
              apiKey: 'r8-test',
              body: {
                input: { width: 512 },
              } as unknown as PrismaJson.ReplicateHandlerBody,
            },
          },
        },
      })
    },
  })

describe('FIRECRAWL function handler', () => {
  // The Firecrawl SDK talks to a hardcoded https://api.firecrawl.dev through
  // axios, which honors HTTPS_PROXY. This local proxy answers for it.
  let firecrawl: Awaited<ReturnType<typeof startTestHttpServer>>
  let replies: Record<string, Reply> = {}

  before(async () => {
    firecrawl = await startTestHttpServer({
      handle: ({ request, res }) => {
        const reply = replies[`${request.method} ${request.path}`] ?? {
          status: 404,
          body: { success: false, error: 'not found' },
        }
        res.writeHead(reply.status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(reply.body))
      },
    })
    process.env.HTTPS_PROXY = firecrawl.url
    process.env.https_proxy = firecrawl.url
  })

  after(async () => {
    await firecrawl.close()
  })

  const lastBody = () => JSON.parse(firecrawl.requests.at(-1)!.rawBody)

  it('scrapes with handler body defaults merged with model args', async () => {
    replies = {
      'POST /v1/scrape': {
        status: 200,
        body: { success: true, data: { markdown: '# Page' } },
      },
    }

    const result = await runFirecrawl({
      type: FirecrawlHandlerType.SCRAPE,
      args: { url: 'https://example.com', waitFor: 100 },
      body: { formats: ['html'], onlyMainContent: true },
    })

    assert.deepStrictEqual(JSON.parse(result.toolOutputs[0]), {
      success: true,
      markdown: '# Page',
    })
    const request = firecrawl.requests.at(-1)!
    assert.strictEqual(request.headers.host, 'api.firecrawl.dev')
    assert.strictEqual(request.headers.authorization, 'Bearer fc-test')
    assert.deepStrictEqual(lastBody(), {
      url: 'https://example.com',
      formats: ['html'],
      onlyMainContent: true,
      waitFor: 100,
    })
  })

  it('scrapes markdown when the handler body has no formats', async () => {
    replies = {
      'POST /v1/scrape': {
        status: 200,
        body: { success: true, data: { markdown: 'md' } },
      },
    }

    await runFirecrawl({
      type: FirecrawlHandlerType.SCRAPE,
      args: { url: 'https://example.com' },
    })

    assert.deepStrictEqual(lastBody(), {
      url: 'https://example.com',
      formats: ['markdown'],
    })
  })

  it('reports scrape failures', async () => {
    replies = {
      'POST /v1/scrape': {
        status: 500,
        body: { success: false, error: 'scrape broke' },
      },
    }

    const result = await runFirecrawl({
      type: FirecrawlHandlerType.SCRAPE,
      args: { url: 'https://example.com' },
    })

    assert.deepStrictEqual(result.toolOutputs, ['Function call failed.'])
    await assertRunLog({
      assistant: result.assistant,
      status: 400,
      message:
        'Failed calling Firecrawl function: Failed to scrape URL. Status code: 500. Error: scrape broke',
    })
  })

  it('crawls and waits for the crawl job to complete', async () => {
    replies = {
      'POST /v1/crawl': { status: 200, body: { success: true, id: 'crawl-1' } },
      'GET /v1/crawl/crawl-1': {
        status: 200,
        body: { status: 'completed', data: [{ markdown: 'one' }] },
      },
    }

    const result = await runFirecrawl({
      type: FirecrawlHandlerType.CRAWL,
      args: { url: 'https://example.com', limit: 2 },
      body: { maxDepth: 1 },
    })

    assert.deepStrictEqual(JSON.parse(result.toolOutputs[0]), {
      status: 'completed',
      data: [{ markdown: 'one' }],
    })
    const crawlRequest = firecrawl.requests.find(
      ({ method, path }) => method === 'POST' && path === '/v1/crawl',
    )!
    assert.deepStrictEqual(JSON.parse(crawlRequest.rawBody), {
      url: 'https://example.com',
      maxDepth: 1,
      limit: 2,
    })
  })

  it('reports crawl failures', async () => {
    replies = {
      'POST /v1/crawl': {
        status: 400,
        body: { success: false, error: 'crawl broke' },
      },
    }

    const result = await runFirecrawl({
      type: FirecrawlHandlerType.CRAWL,
      args: { url: 'https://example.com' },
    })

    assert.deepStrictEqual(result.toolOutputs, ['Function call failed.'])
    await assertRunLog({
      assistant: result.assistant,
      status: 400,
      message:
        'Failed calling Firecrawl function: Request failed with status code 400. Error: crawl broke ',
    })
  })

  it('extracts using the scrape endpoint with the extract format', async () => {
    replies = {
      'POST /v1/scrape': {
        status: 200,
        body: { success: true, data: { extract: { title: 'Hi' } } },
      },
    }

    const result = await runFirecrawl({
      type: FirecrawlHandlerType.EXTRACT,
      args: { url: 'https://example.com', extract: { prompt: 'title' } },
      body: { ignored: true },
    })

    assert.deepStrictEqual(JSON.parse(result.toolOutputs[0]), {
      success: true,
      extract: { title: 'Hi' },
    })
    assert.deepStrictEqual(lastBody(), {
      url: 'https://example.com',
      formats: ['extract'],
      extract: { prompt: 'title' },
    })
  })

  it('reports extract failures', async () => {
    replies = {
      'POST /v1/scrape': {
        status: 402,
        body: { success: false, error: 'no credits' },
      },
    }

    const result = await runFirecrawl({
      type: FirecrawlHandlerType.EXTRACT,
      args: { url: 'https://example.com' },
    })

    assert.deepStrictEqual(result.toolOutputs, ['Function call failed.'])
    await assertRunLog({
      assistant: result.assistant,
      status: 400,
      message:
        'Failed calling Firecrawl function: Failed to scrape URL. Status code: 402. Error: no credits',
    })
  })

  it('searches through the Firecrawl search endpoint', async () => {
    // Search calls the hardcoded host with global fetch, not through axios.
    const redirect = redirectGlobalFetch({
      from: 'https://api.firecrawl.dev',
      to: firecrawl.url,
    })
    replies = {
      'POST /v0/search': {
        status: 200,
        body: { success: true, data: [{ url: 'https://example.com' }] },
      },
    }

    try {
      const result = await runFirecrawl({
        type: FirecrawlHandlerType.SEARCH,
        args: { query: 'superinterface' },
        body: { pageOptions: { fetchPageContent: false } },
      })

      assert.deepStrictEqual(JSON.parse(result.toolOutputs[0]), {
        success: true,
        data: [{ url: 'https://example.com' }],
      })
      const request = firecrawl.requests.at(-1)!
      assert.strictEqual(request.path, '/v0/search')
      assert.strictEqual(request.headers.authorization, 'Bearer fc-test')
      assert.deepStrictEqual(lastBody(), {
        pageOptions: { fetchPageContent: false },
        query: 'superinterface',
      })
    } finally {
      redirect.restore()
    }
  })

  it('reports search failures', async () => {
    // Search uses global fetch against the hardcoded host, so only its error
    // path is reachable offline: an invalid API key fails before any request.
    const before = firecrawl.requests.length
    const result = await runFirecrawl({
      type: FirecrawlHandlerType.SEARCH,
      args: { query: 'superinterface' },
      apiKey: 'invalid\nkey',
    })

    assert.deepStrictEqual(result.toolOutputs, ['Function call failed.'])
    assert.strictEqual(firecrawl.requests.length, before)
    await assertRunLog({
      assistant: result.assistant,
      status: 400,
      message:
        'Failed calling Firecrawl function: Headers.append: "Bearer invalid\nkey" is an invalid header value.',
    })
  })

  it('rejects invalid JSON arguments', async () => {
    const result = await runFirecrawl({
      type: FirecrawlHandlerType.SCRAPE,
      args: '{nope',
    })

    assert.deepStrictEqual(result.toolOutputs, ['Invalid arguments.'])
    await assertRunLog({
      assistant: result.assistant,
      status: 400,
      message:
        "Failed parsing Firecrawl function arguments: Expected property name or '}' in JSON at position 1 (line 1 column 2)",
    })
  })
})

describe('REPLICATE function handler', () => {
  it('runs the model and returns its output', async () => {
    // The Replicate SDK uses global fetch against https://api.replicate.com.
    const replicate = await startTestHttpServer({
      handle: ({ res }) => {
        res.writeHead(201, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify({
            id: 'prediction-1',
            status: 'succeeded',
            output: ['https://replicate.delivery/cat.png'],
            error: null,
          }),
        )
      },
    })
    const redirect = redirectGlobalFetch({
      from: 'https://api.replicate.com',
      to: replicate.url,
    })

    try {
      const result = await runReplicate({
        args: { input: { prompt: 'a cat' } },
        identifier: 'owner/model',
      })

      assert.deepStrictEqual(JSON.parse(result.toolOutputs[0]), [
        'https://replicate.delivery/cat.png',
      ])
      const [request] = replicate.requests
      assert.strictEqual(request.path, '/v1/models/owner/model/predictions')
      assert.strictEqual(request.headers.authorization, 'Bearer r8-test')
      assert.deepStrictEqual(JSON.parse(request.rawBody).input, {
        width: 512,
        prompt: 'a cat',
      })
    } finally {
      redirect.restore()
      await replicate.close()
    }
  })

  it('reports run failures', async () => {
    // The Replicate SDK has no base URL override, so only failures that
    // happen before a request (an invalid model identifier) are reachable.
    const result = await runReplicate({
      args: { prompt: 'a cat' },
      identifier: 'not a model identifier',
    })

    assert.deepStrictEqual(result.toolOutputs, ['Function call failed.'])
    await waitForAssistantLog({
      assistantId: result.assistant.id,
      match: ({ message }) =>
        message.startsWith('Failed calling Replicate RUN function:') &&
        message.includes('Invalid reference to model version'),
    })
  })

  it('rejects invalid JSON arguments', async () => {
    const result = await runReplicate({
      args: '{nope',
      identifier: 'owner/model',
    })

    assert.deepStrictEqual(result.toolOutputs, ['Invalid arguments.'])
    await waitForAssistantLog({
      assistantId: result.assistant.id,
      match: ({ message }) =>
        message.startsWith('Failed parsing Replicate function arguments:'),
    })
  })
})
