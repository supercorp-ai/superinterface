import assert from 'node:assert'
import { after, before, describe, it } from 'node:test'
import { HandlerType, MethodType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTestFunction } from '../../lib/functions/createTestFunction'
import { runFakeToolCalls } from '../../lib/functions/runFakeToolCalls'
import { startTestHttpServer } from '../../lib/http/startTestHttpServer'
import { assertRunLog } from '../../lib/logs/assertRunLog'
import type { FakeLlmToolCall } from '../../lib/llm/startFakeLlm'

type RequestHandlerData = {
  url: string
  method: MethodType
  headers?: Record<string, string>
  // Body templates may hold non-string JSON values too.
  body?: Record<string, unknown>
}

const runRequestFunction = async ({
  args,
  requestHandler,
  body,
  setup = async () => {},
}: {
  args: FakeLlmToolCall['arguments']
  requestHandler: RequestHandlerData
  body?: Record<string, unknown>
  setup?: (args: {
    assistantId: string
  }) => Promise<Record<string, unknown> | void>
}) =>
  runFakeToolCalls({
    toolCalls: [{ name: 'call_api', arguments: args }],
    body,
    setup: async ({ assistant }) => {
      await createTestFunction({
        assistantId: assistant.id,
        openapiSpec: {
          name: 'call_api',
          description: 'Calls the API',
          parameters: { type: 'object', properties: {} },
        },
        handler: {
          type: HandlerType.REQUEST,
          requestHandler: {
            create: {
              url: requestHandler.url,
              method: requestHandler.method,
              headers: requestHandler.headers ?? {},
              body: (requestHandler.body ??
                {}) as PrismaJson.RequestHandlerBody,
            },
          },
        },
      })
      return setup({ assistantId: assistant.id })
    },
  })

describe('REQUEST function handler', () => {
  let api: Awaited<ReturnType<typeof startTestHttpServer>>

  before(async () => {
    api = await startTestHttpServer({
      handle: ({ request, res }) => {
        if (request.path === '/text') {
          res.writeHead(200, { 'content-type': 'text/plain' })
          res.end('plain text result')
          return
        }

        if (request.path === '/no-content-type') {
          res.end('raw result')
          return
        }

        if (request.path === '/bad-json') {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end('{"broken":')
          return
        }

        if (request.path === '/cut-json' || request.path === '/cut-text') {
          const type =
            request.path === '/cut-json' ? 'application/json' : 'text/plain'
          res.writeHead(200, { 'content-type': type, 'content-length': '100' })
          res.write('{"partial":')
          setTimeout(() => res.destroy(), 20)
          return
        }

        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify({
            method: request.method,
            path: request.path,
            query: request.query.toString(),
            body: request.rawBody ? JSON.parse(request.rawBody) : null,
          }),
        )
      },
    })
  })

  after(async () => {
    await api.close()
  })

  const lastRequest = () => api.requests.at(-1)!

  it('sends GET args as query params, merging the existing query string', async () => {
    const result = await runRequestFunction({
      args: { city: 'Vilnius', tags: ['a', 'b'], page: 2 },
      requestHandler: {
        url: `${api.url}/weather?tags=old&units=metric`,
        method: MethodType.GET,
      },
    })

    assert.strictEqual(result.status, 200)
    const output = JSON.parse(result.toolOutputs[0])
    assert.strictEqual(output.method, 'GET')
    assert.strictEqual(output.path, '/weather')
    assert.strictEqual(output.body, null)
    const query = lastRequest().query
    assert.deepStrictEqual(query.getAll('tags'), ['a', 'b'])
    assert.strictEqual(query.get('units'), 'metric')
    assert.strictEqual(query.get('city'), 'Vilnius')
    assert.strictEqual(query.get('page'), '2')
    assert.strictEqual(lastRequest().headers.accept, 'application/json')
  })

  it('keeps the URL as is for GET without args', async () => {
    const result = await runRequestFunction({
      args: {},
      requestHandler: { url: `${api.url}/plain?x=1`, method: MethodType.GET },
    })

    assert.strictEqual(JSON.parse(result.toolOutputs[0]).query, 'x=1')
  })

  it('keeps the URL as is for GET with null args', async () => {
    const result = await runRequestFunction({
      args: 'null',
      requestHandler: {
        url: `${api.url}/nullargs/{{assistantId}}`,
        method: MethodType.GET,
      },
    })

    assert.strictEqual(
      JSON.parse(result.toolOutputs[0]).path,
      `/nullargs/${result.assistant.id}`,
    )
    assert.strictEqual(lastRequest().query.toString(), '')
  })

  it('drops the query string when array args empty it', async () => {
    const result = await runRequestFunction({
      args: { tags: [] },
      requestHandler: {
        url: `${api.url}/empty?tags=x`,
        method: MethodType.GET,
      },
    })

    assert.strictEqual(JSON.parse(result.toolOutputs[0]).query, '')
  })

  it('merges POST args into the interpolated body template', async () => {
    const result = await runRequestFunction({
      args: { overridden: 'from-model', extra: 1, item: 'i-1' },
      body: { customerId: 'cust-9' },
      requestHandler: {
        url: `${api.url}/orders/{{customerId}}/{{item}}`,
        method: MethodType.POST,
        body: {
          customer: '{{customerId}}',
          thread: '{{threadId}}',
          assistant: '{{ assistantId }}',
          overridden: 'template',
          count: 5,
        },
        headers: {
          'X-Customer': '{{customerId}}',
          'X-Empty': '',
        },
      },
    })

    const output = JSON.parse(result.toolOutputs[0])
    const thread = await prisma.thread.findFirstOrThrow({
      where: { assistantId: result.assistant.id },
    })
    assert.strictEqual(output.method, 'POST')
    assert.strictEqual(output.path, '/orders/cust-9/i-1')
    assert.deepStrictEqual(output.body, {
      customer: 'cust-9',
      thread: thread.id,
      assistant: result.assistant.id,
      overridden: 'from-model',
      count: 5,
      extra: 1,
      item: 'i-1',
    })
    assert.strictEqual(lastRequest().headers['x-customer'], 'cust-9')
    assert.strictEqual(lastRequest().headers['x-empty'], '')
    assert.strictEqual(
      lastRequest().headers['content-type'],
      'application/json',
    )
  })

  it('sends the template body for PUT with null args', async () => {
    const result = await runRequestFunction({
      args: 'null',
      requestHandler: {
        url: `${api.url}/put`,
        method: MethodType.PUT,
        body: { fixed: 'value' },
      },
    })

    const output = JSON.parse(result.toolOutputs[0])
    assert.strictEqual(output.method, 'PUT')
    assert.deepStrictEqual(output.body, { fixed: 'value' })
  })

  it('interpolates values on an existing thread without metadata', async () => {
    let threadId = ''
    const result = await runRequestFunction({
      args: {},
      requestHandler: {
        url: `${api.url}/threads/{{threadId}}/{{assistantId}}`,
        method: MethodType.DELETE,
      },
      setup: async ({ assistantId }) => {
        const thread = await prisma.thread.create({
          data: { assistantId, metadata: Prisma.DbNull },
        })
        threadId = thread.id
        return { threadId }
      },
    })

    const output = JSON.parse(result.toolOutputs[0])
    assert.strictEqual(output.method, 'DELETE')
    assert.strictEqual(
      output.path,
      `/threads/${threadId}/${result.assistant.id}`,
    )
  })

  it('reports missing variables instead of calling the endpoint', async () => {
    const before = api.requests.length
    const result = await runRequestFunction({
      args: { a: 1 },
      requestHandler: {
        url: `${api.url}/{{missingPath}}`,
        method: MethodType.PATCH,
        body: { b: '{{missingBody}}' },
        headers: { Authorization: 'Bearer {{missingHeader}}' },
      },
    })

    const message =
      'Missing variables in request handler: missingPath, missingBody, missingHeader'
    assert.deepStrictEqual(result.toolOutputs, [message])
    assert.strictEqual(api.requests.length, before)
    await assertRunLog({ assistant: result.assistant, status: 400, message })
  })

  it('returns an error for invalid JSON arguments', async () => {
    const result = await runRequestFunction({
      args: '{nope',
      requestHandler: { url: `${api.url}/x`, method: MethodType.GET },
    })

    const error =
      "Expected property name or '}' in JSON at position 1 (line 1 column 2)"
    assert.deepStrictEqual(result.toolOutputs, [JSON.stringify({ error })])
    await assertRunLog({
      assistant: result.assistant,
      status: 500,
      message: `Failed parsing request function arguments: ${error}`,
    })
  })

  it('returns an error when the endpoint is unreachable', async () => {
    const closed = await startTestHttpServer({ handle: () => {} })
    await closed.close()

    const result = await runRequestFunction({
      args: {},
      requestHandler: { url: `${closed.url}/gone`, method: MethodType.GET },
    })

    assert.deepStrictEqual(JSON.parse(result.toolOutputs[0]), {
      error: 'fetch failed',
    })
    await assertRunLog({
      assistant: result.assistant,
      status: 500,
      message: 'Request failed: fetch failed',
    })
  })

  it('returns text responses as is', async () => {
    const result = await runRequestFunction({
      args: {},
      requestHandler: { url: `${api.url}/text`, method: MethodType.GET },
    })

    assert.deepStrictEqual(result.toolOutputs, ['plain text result'])
  })

  it('returns responses without a content type as text', async () => {
    const result = await runRequestFunction({
      args: {},
      requestHandler: {
        url: `${api.url}/no-content-type`,
        method: MethodType.GET,
      },
    })

    assert.deepStrictEqual(result.toolOutputs, ['raw result'])
  })

  it('returns an error for malformed JSON responses', async () => {
    const result = await runRequestFunction({
      args: {},
      requestHandler: { url: `${api.url}/bad-json`, method: MethodType.GET },
    })

    assert.deepStrictEqual(result.toolOutputs, [
      JSON.stringify({ error: 'Unexpected end of JSON input' }),
    ])
    await assertRunLog({
      assistant: result.assistant,
      status: 500,
      message: 'Failed parsing request response: Unexpected end of JSON input',
    })
  })

  it('returns an error when a JSON response body is cut off', async () => {
    const result = await runRequestFunction({
      args: {},
      requestHandler: { url: `${api.url}/cut-json`, method: MethodType.GET },
    })

    assert.deepStrictEqual(result.toolOutputs, [
      JSON.stringify({ error: 'terminated' }),
    ])
    await assertRunLog({
      assistant: result.assistant,
      status: 500,
      message: 'Failed parsing request response: terminated',
    })
  })

  it('returns an error when a text response body is cut off', async () => {
    const result = await runRequestFunction({
      args: {},
      requestHandler: { url: `${api.url}/cut-text`, method: MethodType.GET },
    })

    assert.deepStrictEqual(result.toolOutputs, [
      JSON.stringify({ error: 'terminated' }),
    ])
    await assertRunLog({
      assistant: result.assistant,
      status: 500,
      message: 'Failed parsing request response: terminated',
    })
  })
})
