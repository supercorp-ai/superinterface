import {
  testApiHandler,
  type NtarhInitAppRouter,
} from 'next-test-api-route-handler'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { before, describe, it } from 'node:test'
import { TransportType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTestAssistantSetup } from '../../lib/assistants/createTestAssistantSetup'
import { corsHeadersOf } from '../../lib/http/corsHeadersOf'

type AppHandler = NtarhInitAppRouter['appHandler']

type Route = {
  name: string
  load: () => Promise<AppHandler>
  childParam?: 'functionId' | 'toolId' | 'mcpServerId'
  methods: string[]
}

const routes: Route[] = [
  {
    name: '/api/assistants',
    load: () => import('../../../src/app/api/assistants/route'),
    methods: ['GET', 'POST'],
  },
  {
    name: '/api/assistants/[assistantId]',
    load: () => import('../../../src/app/api/assistants/[assistantId]/route'),
    methods: ['PATCH', 'DELETE'],
  },
  {
    name: '/api/assistants/[assistantId]/functions',
    load: () =>
      import('../../../src/app/api/assistants/[assistantId]/functions/route'),
    methods: ['GET', 'POST'],
  },
  {
    name: '/api/assistants/[assistantId]/functions/[functionId]',
    load: () =>
      import(
        '../../../src/app/api/assistants/[assistantId]/functions/[functionId]/route'
      ),
    childParam: 'functionId',
    methods: ['GET', 'PATCH', 'DELETE'],
  },
  {
    name: '/api/assistants/[assistantId]/initial-messages',
    load: () =>
      import(
        '../../../src/app/api/assistants/[assistantId]/initial-messages/route'
      ),
    methods: ['GET', 'PUT'],
  },
  {
    name: '/api/assistants/[assistantId]/tools',
    load: () =>
      import('../../../src/app/api/assistants/[assistantId]/tools/route'),
    methods: ['GET', 'POST'],
  },
  {
    name: '/api/assistants/[assistantId]/tools/[toolId]',
    load: () =>
      import(
        '../../../src/app/api/assistants/[assistantId]/tools/[toolId]/route'
      ),
    childParam: 'toolId',
    methods: ['GET', 'PATCH', 'DELETE'],
  },
  {
    name: '/api/assistants/[assistantId]/mcp-servers',
    load: () =>
      import('../../../src/app/api/assistants/[assistantId]/mcp-servers/route'),
    methods: ['GET', 'POST'],
  },
  {
    name: '/api/assistants/[assistantId]/mcp-servers/[mcpServerId]',
    load: () =>
      import(
        '../../../src/app/api/assistants/[assistantId]/mcp-servers/[mcpServerId]/route'
      ),
    childParam: 'mcpServerId',
    methods: ['GET', 'PATCH', 'DELETE'],
  },
]

const request = async ({
  appHandler,
  params,
  method,
  headers = {},
  body,
}: {
  appHandler: AppHandler
  params: Record<string, string>
  method: string
  headers?: Record<string, string>
  body?: unknown
}) => {
  let status = 0
  let json: Record<string, unknown> = {}
  let responseHeaders: Headers = new Headers()

  await testApiHandler({
    appHandler,
    params,
    test: async ({ fetch }) => {
      const response = await fetch({
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
      status = response.status
      responseHeaders = response.headers
      json = await response.json()
    },
  })

  return { status, json, headers: responseHeaders }
}

const bodyFor = ({ method }: { method: string }) => {
  if (method === 'GET' || method === 'DELETE') return undefined
  return {}
}

describe('assistant configuration route guards', () => {
  let setup: Awaited<ReturnType<typeof createTestAssistantSetup>>

  before(async () => {
    setup = await createTestAssistantSetup()
  })

  const paramsFor = ({
    route,
    assistantId,
    childId,
  }: {
    route: Route
    assistantId: string
    childId: string
  }) => {
    if (!route.childParam) return { assistantId }
    return { assistantId, [route.childParam]: childId }
  }

  // These tests run first, so each route module is loaded by a test that
  // calls every handler it exports.
  for (const route of routes) {
    it(`${route.name} answers CORS preflight and requires an authorization header for ${route.methods.join(', ')}`, async () => {
      const appHandler = await route.load()
      const params = paramsFor({
        route,
        assistantId: setup.assistant.id,
        childId: randomUUID(),
      })

      const options = await request({ appHandler, params, method: 'OPTIONS' })
      assert.strictEqual(options.status, 200)
      assert.deepStrictEqual(options.json, {})
      assert.deepStrictEqual(corsHeadersOf({ headers: options.headers }), {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'access-control-allow-headers':
          'Content-Type, Authorization, X-Requested-With, Accept',
      })

      for (const method of route.methods) {
        const { status, json } = await request({
          appHandler,
          params,
          method,
          body: bodyFor({ method }),
        })

        assert.strictEqual(status, 400, method)
        assert.deepStrictEqual(
          json,
          { error: 'No authorization header found' },
          method,
        )
      }
    })
  }

  for (const route of routes) {
    for (const method of route.methods) {
      it(`${method} ${route.name} rejects unknown and public API keys`, async () => {
        const appHandler = await route.load()
        const params = paramsFor({
          route,
          assistantId: setup.assistant.id,
          childId: randomUUID(),
        })

        const unknown = await request({
          appHandler,
          params,
          method,
          headers: { Authorization: `Bearer ${randomUUID()}` },
          body: bodyFor({ method }),
        })
        assert.strictEqual(unknown.status, 400)
        assert.deepStrictEqual(unknown.json, { error: 'Invalid api key' })

        const publicKey = await request({
          appHandler,
          params,
          method,
          headers: { Authorization: `Bearer ${setup.publicKey.value}` },
          body: bodyFor({ method }),
        })
        assert.strictEqual(publicKey.status, 400)
        assert.deepStrictEqual(publicKey.json, { error: 'Invalid api key' })

        const malformed = await request({
          appHandler,
          params,
          method,
          headers: { Authorization: 'Bearer not-a-uuid' },
          body: bodyFor({ method }),
        })
        assert.strictEqual(malformed.status, 400)
        assert.deepStrictEqual(malformed.json, { error: 'Invalid api key' })
      })

      if (route.childParam) {
        const childLabel = {
          functionId: 'function',
          toolId: 'tool',
          mcpServerId: 'MCP server',
        }[route.childParam]

        it(`${method} ${route.name} validates ids before touching the database`, async () => {
          const appHandler = await route.load()

          const badAssistant = await request({
            appHandler,
            params: paramsFor({
              route,
              assistantId: 'not-a-uuid',
              childId: randomUUID(),
            }),
            method,
            headers: setup.authHeaders,
            body: bodyFor({ method }),
          })
          assert.strictEqual(badAssistant.status, 400)
          assert.deepStrictEqual(badAssistant.json, {
            error: 'Invalid assistant id',
          })

          const badChild = await request({
            appHandler,
            params: paramsFor({
              route,
              assistantId: setup.assistant.id,
              childId: 'not-a-uuid',
            }),
            method,
            headers: setup.authHeaders,
            body: bodyFor({ method }),
          })
          assert.strictEqual(badChild.status, 400)
          assert.deepStrictEqual(badChild.json, {
            error: `Invalid ${childLabel} id`,
          })
        })
      }
    }
  }

  describe('resources owned by another workspace', () => {
    let otherSetup: Awaited<ReturnType<typeof createTestAssistantSetup>>
    let ids: Record<'functionId' | 'toolId' | 'mcpServerId', string>

    before(async () => {
      otherSetup = await createTestAssistantSetup()
      const fn = await prisma.function.create({
        data: {
          assistantId: otherSetup.assistant.id,
          openapiSpec: { name: 'foreign' },
          handler: {
            create: {
              type: 'CREATE_TASK',
              createTaskHandler: { create: { keyTemplate: '' } },
            },
          },
        },
      })
      const tool = await prisma.tool.create({
        data: {
          assistantId: otherSetup.assistant.id,
          type: 'WEB_SEARCH',
          webSearchTool: { create: {} },
        },
      })
      const mcpServer = await prisma.mcpServer.create({
        data: {
          assistantId: otherSetup.assistant.id,
          transportType: TransportType.HTTP,
          httpTransport: {
            create: { url: 'https://example.com/mcp', headers: {} },
          },
        },
      })
      ids = { functionId: fn.id, toolId: tool.id, mcpServerId: mcpServer.id }
    })

    const notFoundBody = ({
      route,
      method,
    }: {
      route: Route
      method: string
    }) => {
      if (method === 'GET' || method === 'DELETE') return undefined
      if (route.name.endsWith('/functions/[functionId]')) {
        return {
          openapiSpec: '{"name":"fn"}',
          handler: {
            type: 'CREATE_TASK',
            createTaskHandler: { keyTemplate: '' },
          },
        }
      }
      if (route.name.endsWith('/initial-messages')) {
        return { initialMessages: [] }
      }
      if (route.name.includes('/mcp-servers')) {
        return {
          transportType: TransportType.HTTP,
          httpTransport: { url: 'https://example.com/x', headers: '{}' },
        }
      }
      return {}
    }

    const expectedError = ({ route }: { route: Route }) => {
      if (route.childParam === 'functionId') return 'No function found'
      if (route.childParam === 'toolId') return 'No tool found'
      if (route.childParam === 'mcpServerId') return 'No MCP server found'
      return 'No assistant found'
    }

    const scopedRoutes = routes.filter(({ name }) => name !== '/api/assistants')

    for (const route of scopedRoutes) {
      for (const method of route.methods) {
        it(`${method} ${route.name} hides resources of other workspaces`, async () => {
          const { status, json } = await request({
            appHandler: await route.load(),
            params: paramsFor({
              route,
              assistantId: otherSetup.assistant.id,
              childId: route.childParam ? ids[route.childParam] : '',
            }),
            method,
            headers: setup.authHeaders,
            body: notFoundBody({ route, method }),
          })

          assert.strictEqual(status, 400)
          assert.deepStrictEqual(json, { error: expectedError({ route }) })
        })
      }
    }

    it('leaves the foreign resources untouched', async () => {
      const [fn, tool, mcpServer, assistant] = await Promise.all([
        prisma.function.findUnique({ where: { id: ids.functionId } }),
        prisma.tool.findUnique({ where: { id: ids.toolId } }),
        prisma.mcpServer.findUnique({ where: { id: ids.mcpServerId } }),
        prisma.assistant.findUnique({ where: { id: otherSetup.assistant.id } }),
      ])
      assert.ok(fn)
      assert.ok(tool)
      assert.ok(mcpServer)
      assert.ok(assistant)
    })
  })
})
