import {
  testApiHandler,
  type NtarhInitAppRouter,
} from 'next-test-api-route-handler'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { describe, it } from 'node:test'
import { TransportType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTestAssistantSetup } from '../../lib/assistants/createTestAssistantSetup'

const loadCollection = () =>
  import('../../../src/app/api/assistants/[assistantId]/mcp-servers/route')

const loadDetail = () =>
  import(
    '../../../src/app/api/assistants/[assistantId]/mcp-servers/[mcpServerId]/route'
  )

type AppHandler = NtarhInitAppRouter['appHandler']
type Setup = Awaited<ReturnType<typeof createTestAssistantSetup>>

const parseJson = ({ text }: { text: string }) => {
  try {
    return JSON.parse(text)
  } catch {
    return { text }
  }
}

const call = async ({
  appHandler,
  params,
  method,
  headers,
  body,
}: {
  appHandler: AppHandler
  params: Record<string, string>
  method: string
  headers: Record<string, string>
  body?: unknown
}) => {
  let status = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let json: any = null
  await testApiHandler({
    appHandler,
    params,
    rejectOnHandlerError: false,
    test: async ({ fetch }) => {
      const response = await fetch({
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
      status = response.status
      json = parseJson({ text: await response.text() })
    },
  })
  return { status, json }
}

const post = async ({ setup, body }: { setup: Setup; body: unknown }) =>
  call({
    appHandler: await loadCollection(),
    params: { assistantId: setup.assistant.id },
    method: 'POST',
    headers: setup.authHeaders,
    body,
  })

const patch = async ({
  setup,
  mcpServerId,
  body,
}: {
  setup: Setup
  mcpServerId: string
  body: unknown
}) =>
  call({
    appHandler: await loadDetail(),
    params: { assistantId: setup.assistant.id, mcpServerId },
    method: 'PATCH',
    headers: setup.authHeaders,
    body,
  })

const httpBody = ({ url = 'https://example.com/mcp' } = {}) => ({
  transportType: TransportType.HTTP,
  httpTransport: { url, headers: '{"x-key":"1"}' },
})

const sseBody = ({ url = 'https://example.com/sse' } = {}) => ({
  transportType: TransportType.SSE,
  sseTransport: { url, headers: '{"x-sse":"1"}' },
})

describe('/api/assistants/[assistantId]/mcp-servers', () => {
  it('creates SSE and unnamed HTTP servers and lists them newest first', async () => {
    const setup = await createTestAssistantSetup()

    const sse = await post({
      setup,
      body: { ...sseBody(), name: 'Events', description: 'Event stream' },
    })
    assert.strictEqual(sse.status, 200)
    const storedSse = await prisma.mcpServer.findUniqueOrThrow({
      where: { id: sse.json.mcpServer.id },
      include: { sseTransport: true },
    })
    assert.strictEqual(storedSse.assistantId, setup.assistant.id)
    assert.deepStrictEqual(sse.json.mcpServer, {
      id: storedSse.id,
      name: 'Events',
      description: 'Event stream',
      transportType: TransportType.SSE,
      sseTransport: {
        id: storedSse.sseTransport!.id,
        url: 'https://example.com/sse',
        headers: { 'x-sse': '1' },
        createdAt: storedSse.sseTransport!.createdAt.toISOString(),
        updatedAt: storedSse.sseTransport!.updatedAt.toISOString(),
      },
      httpTransport: null,
      createdAt: storedSse.createdAt.toISOString(),
      updatedAt: storedSse.updatedAt.toISOString(),
    })

    const http = await post({ setup, body: httpBody() })
    assert.strictEqual(http.status, 200)
    const storedHttp = await prisma.mcpServer.findUniqueOrThrow({
      where: { id: http.json.mcpServer.id },
      include: { httpTransport: true },
    })
    assert.deepStrictEqual(http.json.mcpServer, {
      id: storedHttp.id,
      name: null,
      description: null,
      transportType: TransportType.HTTP,
      sseTransport: null,
      httpTransport: {
        id: storedHttp.httpTransport!.id,
        url: 'https://example.com/mcp',
        headers: { 'x-key': '1' },
        createdAt: storedHttp.httpTransport!.createdAt.toISOString(),
        updatedAt: storedHttp.httpTransport!.updatedAt.toISOString(),
      },
      createdAt: storedHttp.createdAt.toISOString(),
      updatedAt: storedHttp.updatedAt.toISOString(),
    })

    const list = await call({
      appHandler: await loadCollection(),
      params: { assistantId: setup.assistant.id },
      method: 'GET',
      headers: setup.authHeaders,
    })
    assert.strictEqual(list.status, 200)
    assert.deepStrictEqual(list.json, {
      mcpServers: [http.json.mcpServer, sse.json.mcpServer],
    })
  })

  it('rejects STDIO servers and missing transport configuration', async () => {
    const setup = await createTestAssistantSetup()

    for (const body of [
      {
        transportType: TransportType.STDIO,
        stdioTransport: { command: 'npx', args: 'server' },
      },
      { transportType: TransportType.STDIO },
      { transportType: TransportType.SSE },
      { transportType: TransportType.HTTP, httpTransport: null },
      {
        transportType: TransportType.HTTP,
        httpTransport: { url: 'https://example.com', headers: 'nope' },
      },
      { ...httpBody(), name: '' },
    ]) {
      const { status, json } = await post({ setup, body })
      assert.strictEqual(status, 400)
      assert.deepStrictEqual(json, { error: 'Invalid payload' })
    }

    const count = await prisma.mcpServer.count({
      where: { assistantId: setup.assistant.id },
    })
    assert.strictEqual(count, 0)
  })

  it('treats a name matching an unnamed server fallback label as taken', async () => {
    const setup = await createTestAssistantSetup()
    const unnamed = await post({ setup, body: httpBody() })

    const { status, json } = await post({
      setup,
      body: { ...httpBody(), name: `MCP-Server-${unnamed.json.mcpServer.id}` },
    })

    assert.strictEqual(status, 400)
    assert.deepStrictEqual(json, {
      error: 'An MCP server with that name already exists.',
    })
  })

  it('ignores existing servers whose names have no letters or digits', async () => {
    const setup = await createTestAssistantSetup()
    await prisma.mcpServer.create({
      data: {
        assistantId: setup.assistant.id,
        name: '---',
        transportType: TransportType.HTTP,
        httpTransport: { create: { url: 'https://example.com', headers: {} } },
      },
    })

    const { status, json } = await post({
      setup,
      body: { ...httpBody(), name: 'Fresh', description: 'Fresh server' },
    })

    assert.strictEqual(status, 200)
    assert.strictEqual(json.mcpServer.name, 'Fresh')
    assert.strictEqual(json.mcpServer.description, 'Fresh server')
  })
})

describe('/api/assistants/[assistantId]/mcp-servers/[mcpServerId]', () => {
  it('gets a single server', async () => {
    const setup = await createTestAssistantSetup()
    const created = await post({
      setup,
      body: { ...sseBody(), name: 'Single' },
    })

    const { status, json } = await call({
      appHandler: await loadDetail(),
      params: {
        assistantId: setup.assistant.id,
        mcpServerId: created.json.mcpServer.id,
      },
      method: 'GET',
      headers: setup.authHeaders,
    })

    assert.strictEqual(status, 200)
    assert.deepStrictEqual(json.mcpServer, created.json.mcpServer)
  })

  it('updates an SSE server transport without renaming it', async () => {
    const setup = await createTestAssistantSetup()
    const created = await post({
      setup,
      body: { ...sseBody(), name: 'Keep name' },
    })

    const { status, json } = await patch({
      setup,
      mcpServerId: created.json.mcpServer.id,
      body: sseBody({ url: 'https://example.com/sse-2' }),
    })

    assert.strictEqual(status, 200)
    assert.strictEqual(json.mcpServer.name, 'Keep name')
    assert.strictEqual(
      json.mcpServer.sseTransport.url,
      'https://example.com/sse-2',
    )
    const stored = await prisma.sseTransport.findUniqueOrThrow({
      where: { mcpServerId: created.json.mcpServer.id },
    })
    assert.strictEqual(stored.url, 'https://example.com/sse-2')
  })

  it('keeps its own name when renaming to the same normalized label', async () => {
    const setup = await createTestAssistantSetup()
    const created = await post({
      setup,
      body: { ...httpBody(), name: 'Docs' },
    })

    const { status, json } = await patch({
      setup,
      mcpServerId: created.json.mcpServer.id,
      body: { ...httpBody(), name: 'docs', description: 'Documentation' },
    })

    assert.strictEqual(status, 200)
    assert.strictEqual(json.mcpServer.name, 'docs')
    assert.strictEqual(json.mcpServer.description, 'Documentation')
  })

  it('rejects names without letters or digits on PATCH', async () => {
    const setup = await createTestAssistantSetup()
    const created = await post({
      setup,
      body: { ...httpBody(), name: 'Valid' },
    })

    const { status, json } = await patch({
      setup,
      mcpServerId: created.json.mcpServer.id,
      body: { ...httpBody(), name: '!!!' },
    })

    assert.strictEqual(status, 400)
    assert.match(json.error, /^Invalid MCP server name/)
    const stored = await prisma.mcpServer.findUniqueOrThrow({
      where: { id: created.json.mcpServer.id },
    })
    assert.strictEqual(stored.name, 'Valid')
  })

  it('rejects invalid PATCH payloads', async () => {
    const setup = await createTestAssistantSetup()
    const created = await post({ setup, body: httpBody() })

    const { status, json } = await patch({
      setup,
      mcpServerId: created.json.mcpServer.id,
      body: { transportType: TransportType.SSE },
    })

    assert.strictEqual(status, 400)
    assert.deepStrictEqual(json, { error: 'Invalid payload' })
  })

  it('cannot switch an HTTP server to SSE because no SSE transport exists', async () => {
    const setup = await createTestAssistantSetup()
    const created = await post({ setup, body: httpBody() })

    const { status } = await patch({
      setup,
      mcpServerId: created.json.mcpServer.id,
      body: sseBody(),
    })

    // Known limitation: PATCH issues a nested `update` for the new transport,
    // which fails when the server never had one.
    assert.strictEqual(status, 500)
    const stored = await prisma.mcpServer.findUniqueOrThrow({
      where: { id: created.json.mcpServer.id },
      include: { sseTransport: true },
    })
    assert.strictEqual(stored.transportType, TransportType.HTTP)
    assert.strictEqual(stored.sseTransport, null)
  })

  it('deletes a server with its transport', async () => {
    const setup = await createTestAssistantSetup()
    const created = await post({
      setup,
      body: { ...sseBody(), name: 'Gone' },
    })

    const { status, json } = await call({
      appHandler: await loadDetail(),
      params: {
        assistantId: setup.assistant.id,
        mcpServerId: created.json.mcpServer.id,
      },
      method: 'DELETE',
      headers: setup.authHeaders,
    })

    assert.strictEqual(status, 200)
    assert.strictEqual(json.mcpServer.id, created.json.mcpServer.id)
    assert.strictEqual(json.mcpServer.name, 'Gone')
    const [server, transport] = await Promise.all([
      prisma.mcpServer.findUnique({ where: { id: created.json.mcpServer.id } }),
      prisma.sseTransport.findUnique({
        where: { mcpServerId: created.json.mcpServer.id },
      }),
    ])
    assert.strictEqual(server, null)
    assert.strictEqual(transport, null)
  })

  it('returns 400 for unknown servers of an owned assistant', async () => {
    const setup = await createTestAssistantSetup()

    for (const method of ['GET', 'PATCH', 'DELETE']) {
      const { status, json } = await call({
        appHandler: await loadDetail(),
        params: { assistantId: setup.assistant.id, mcpServerId: randomUUID() },
        method,
        headers: setup.authHeaders,
        ...(method === 'PATCH' ? { body: httpBody() } : {}),
      })
      assert.strictEqual(status, 400, method)
      assert.deepStrictEqual(json, { error: 'No MCP server found' })
    }
  })
})
