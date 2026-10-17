import {
  testApiHandler,
  type NtarhInitAppRouter,
} from 'next-test-api-route-handler'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { describe, it } from 'node:test'
import {
  ClientToolHandlerType,
  FirecrawlHandlerType,
  HandlerType,
  MethodType,
  ReplicateHandlerType,
} from '@prisma/client'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { createTestAssistantSetup } from '../../lib/assistants/createTestAssistantSetup'
import { createTestAssistant } from '../../lib/assistants/createTestAssistant'

const loadCollection = () =>
  import('../../../src/app/api/assistants/[assistantId]/functions/route')

const loadDetail = () =>
  import(
    '../../../src/app/api/assistants/[assistantId]/functions/[functionId]/route'
  )

const parseJson = ({ text }: { text: string }) => {
  try {
    return JSON.parse(text)
  } catch {
    return { text }
  }
}

type AppHandler = NtarhInitAppRouter['appHandler']

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
      const text = await response.text()
      json = parseJson({ text })
    },
  })
  return { status, json }
}

const openapiSpec = ({ name }: { name: string }) =>
  JSON.stringify({
    name,
    description: `${name} description`,
    parameters: { type: 'object', properties: {} },
  })

// One valid payload per handler type, plus the serialized handler the API
// returns for it. `assistantId` is the target for the ASSISTANT handler.
const handlerCases = ({ assistantId }: { assistantId: string }) => [
  {
    type: HandlerType.REQUEST,
    input: {
      requestHandler: {
        method: MethodType.POST,
        url: 'https://example.com/hook',
        headers: '{"x-test":"1"}',
        body: '{"hello":"world"}',
      },
    },
    expected: {
      requestHandler: {
        method: MethodType.POST,
        url: 'https://example.com/hook',
        headers: { 'x-test': '1' },
        body: { hello: 'world' },
      },
    },
  },
  {
    type: HandlerType.FIRECRAWL,
    input: {
      firecrawlHandler: {
        type: FirecrawlHandlerType.SCRAPE,
        apiKey: 'fc-key',
        body: '{"url":"https://example.com"}',
      },
    },
    expected: {
      firecrawlHandler: {
        type: FirecrawlHandlerType.SCRAPE,
        apiKey: 'fc-key',
        body: { url: 'https://example.com' },
      },
    },
  },
  {
    type: HandlerType.ASSISTANT,
    input: { assistantHandler: { assistantId } },
    expected: { assistantHandler: { assistantId } },
  },
  {
    type: HandlerType.REPLICATE,
    input: {
      replicateHandler: {
        type: ReplicateHandlerType.RUN,
        identifier: 'owner/model',
        apiKey: 'r8-key',
        body: '{"input":{}}',
      },
    },
    expected: {
      replicateHandler: {
        type: ReplicateHandlerType.RUN,
        identifier: 'owner/model',
        apiKey: 'r8-key',
        body: { input: {} },
      },
    },
  },
  {
    type: HandlerType.CLIENT_TOOL,
    input: {
      clientToolHandler: {
        type: ClientToolHandlerType.FUNCTION,
        name: 'openModal',
        arguments: '{"id":1}',
      },
    },
    expected: {
      clientToolHandler: {
        type: ClientToolHandlerType.FUNCTION,
        name: 'openModal',
        arguments: { id: 1 },
      },
    },
  },
  {
    type: HandlerType.CREATE_TASK,
    input: { createTaskHandler: { keyTemplate: 'create-{{threadId}}' } },
    expected: { createTaskHandler: { keyTemplate: 'create-{{threadId}}' } },
  },
  {
    type: HandlerType.LIST_TASKS,
    input: { listTasksHandler: { keyTemplate: 'list' } },
    expected: { listTasksHandler: { keyTemplate: 'list' } },
  },
  {
    type: HandlerType.UPDATE_TASK,
    input: { updateTaskHandler: { keyTemplate: 'update' } },
    expected: { updateTaskHandler: { keyTemplate: 'update' } },
  },
  {
    type: HandlerType.DELETE_TASK,
    input: { deleteTaskHandler: { keyTemplate: '' } },
    expected: { deleteTaskHandler: { keyTemplate: '' } },
  },
]

const subHandlerKey = {
  [HandlerType.REQUEST]: 'requestHandler',
  [HandlerType.FIRECRAWL]: 'firecrawlHandler',
  [HandlerType.ASSISTANT]: 'assistantHandler',
  [HandlerType.REPLICATE]: 'replicateHandler',
  [HandlerType.CLIENT_TOOL]: 'clientToolHandler',
  [HandlerType.CREATE_TASK]: 'createTaskHandler',
  [HandlerType.LIST_TASKS]: 'listTasksHandler',
  [HandlerType.UPDATE_TASK]: 'updateTaskHandler',
  [HandlerType.DELETE_TASK]: 'deleteTaskHandler',
} as const

describe('/api/assistants/[assistantId]/functions', () => {
  it('creates a function for every handler type and lists them newest first', async () => {
    const setup = await createTestAssistantSetup()
    const target = await createTestAssistant({
      data: {
        workspaceId: setup.workspace.id,
        modelProviderId: setup.modelProvider.id,
        name: 'Delegate',
      },
    })
    const cases = handlerCases({ assistantId: target.id })
    const createdIds: string[] = []

    for (const handlerCase of cases) {
      const { status, json } = await call({
        appHandler: await loadCollection(),
        params: { assistantId: setup.assistant.id },
        method: 'POST',
        headers: setup.authHeaders,
        body: {
          openapiSpec: openapiSpec({ name: handlerCase.type.toLowerCase() }),
          handler: { type: handlerCase.type, ...handlerCase.input },
        },
      })

      assert.strictEqual(status, 200, handlerCase.type)
      assert.deepStrictEqual(json.function.handler, {
        type: handlerCase.type,
        ...handlerCase.expected,
      })
      assert.strictEqual(
        json.function.openapiSpec.name,
        handlerCase.type.toLowerCase(),
      )
      createdIds.push(json.function.id)

      const stored = await prisma.function.findUniqueOrThrow({
        where: { id: json.function.id },
        include: { handler: true },
      })
      assert.strictEqual(stored.assistantId, setup.assistant.id)
      assert.strictEqual(stored.handler?.type, handlerCase.type)
    }

    const { status, json } = await call({
      appHandler: await loadCollection(),
      params: { assistantId: setup.assistant.id },
      method: 'GET',
      headers: setup.authHeaders,
    })

    assert.strictEqual(status, 200)
    assert.deepStrictEqual(
      json.functions.map(({ id }: { id: string }) => id),
      [...createdIds].reverse(),
    )
    assert.deepStrictEqual(
      json.functions.map(({ handler }: { handler: { type: string } }) =>
        Object.keys(handler).sort(),
      ),
      [...cases]
        .reverse()
        .map(({ type }) => ['type', subHandlerKey[type]].sort()),
    )
  })

  it('rejects every handler type when its configuration is missing', async (t) => {
    const setup = await createTestAssistantSetup()
    const consoleError = t.mock.method(console, 'error', () => {})

    for (const type of Object.values(HandlerType)) {
      for (const subHandler of [undefined, null]) {
        consoleError.mock.resetCalls()
        const { status, json } = await call({
          appHandler: await loadCollection(),
          params: { assistantId: setup.assistant.id },
          method: 'POST',
          headers: setup.authHeaders,
          body: {
            openapiSpec: openapiSpec({ name: 'missing' }),
            handler: {
              type,
              ...(subHandler === null ? { [subHandlerKey[type]]: null } : {}),
            },
          },
        })

        assert.strictEqual(status, 400, type)
        assert.deepStrictEqual(json, { error: 'Invalid payload' })

        // The validation error is logged with the issue placed under the
        // missing handler configuration.
        assert.strictEqual(consoleError.mock.callCount(), 1, type)
        const [label, error] = consoleError.mock.calls[0].arguments
        assert.strictEqual(label, 'Function creation error:')
        assert.ok(error instanceof ZodError, type)
        assert.deepStrictEqual(
          error.issues.map(({ path, code }) => ({ path, code })),
          [{ path: ['handler', subHandlerKey[type]], code: 'invalid_type' }],
          type,
        )
      }
    }

    const count = await prisma.function.count({
      where: { assistantId: setup.assistant.id },
    })
    assert.strictEqual(count, 0)
  })

  it('rejects handler configurations with invalid JSON and bad specs', async (t) => {
    const setup = await createTestAssistantSetup()
    const consoleError = t.mock.method(console, 'error', () => {})
    const bodies = [
      {
        openapiSpec: 'not json',
        handler: {
          type: HandlerType.CREATE_TASK,
          createTaskHandler: { keyTemplate: '' },
        },
      },
      {
        openapiSpec: openapiSpec({ name: 'fn' }),
        handler: {
          type: HandlerType.REQUEST,
          requestHandler: {
            method: MethodType.GET,
            url: 'https://example.com',
            headers: '{not json',
            body: '{}',
          },
        },
      },
      {
        openapiSpec: openapiSpec({ name: 'fn' }),
        handler: {
          type: HandlerType.FIRECRAWL,
          firecrawlHandler: {
            type: FirecrawlHandlerType.CRAWL,
            apiKey: 'k',
            body: '{oops',
          },
        },
      },
      {
        openapiSpec: openapiSpec({ name: 'fn' }),
        handler: {
          type: HandlerType.REPLICATE,
          replicateHandler: {
            type: ReplicateHandlerType.RUN,
            identifier: 'x',
            apiKey: 'k',
            body: '{oops',
          },
        },
      },
      {
        openapiSpec: openapiSpec({ name: 'fn' }),
        handler: {
          type: HandlerType.CLIENT_TOOL,
          clientToolHandler: {
            type: ClientToolHandlerType.FUNCTION,
            name: 'x',
            arguments: '{oops',
          },
        },
      },
      {
        openapiSpec: openapiSpec({ name: 'fn' }),
        handler: { type: 'UNKNOWN' },
      },
    ]

    const issuesByBody: { path: (string | number)[]; code: string }[][] = []

    for (const body of bodies) {
      consoleError.mock.resetCalls()
      const { status, json } = await call({
        appHandler: await loadCollection(),
        params: { assistantId: setup.assistant.id },
        method: 'POST',
        headers: setup.authHeaders,
        body,
      })
      assert.strictEqual(status, 400)
      assert.deepStrictEqual(json, { error: 'Invalid payload' })
      assert.strictEqual(consoleError.mock.callCount(), 1)
      const [label, error] = consoleError.mock.calls[0].arguments
      assert.strictEqual(label, 'Function creation error:')
      assert.ok(error instanceof ZodError)
      issuesByBody.push(error.issues.map(({ path, code }) => ({ path, code })))
    }

    // Invalid handler JSON is reported both by the base schema and by the
    // handler-specific refinement.
    const invalidJsonAt = (path: string[]) => ({ path, code: 'custom' })
    assert.deepStrictEqual(issuesByBody, [
      [invalidJsonAt(['openapiSpec'])],
      [
        invalidJsonAt(['handler', 'requestHandler', 'headers']),
        invalidJsonAt(['handler', 'requestHandler', 'headers']),
      ],
      [
        invalidJsonAt(['handler', 'firecrawlHandler', 'body']),
        invalidJsonAt(['handler', 'firecrawlHandler', 'body']),
      ],
      [
        invalidJsonAt(['handler', 'replicateHandler', 'body']),
        invalidJsonAt(['handler', 'replicateHandler', 'body']),
      ],
      [
        invalidJsonAt(['handler', 'clientToolHandler', 'arguments']),
        invalidJsonAt(['handler', 'clientToolHandler', 'arguments']),
      ],
      [{ path: ['handler', 'type'], code: 'invalid_enum_value' }],
    ])
  })

  it('fails to create an ASSISTANT handler pointing outside the workspace', async () => {
    const setup = await createTestAssistantSetup()
    const foreign = await createTestAssistantSetup()

    const { status } = await call({
      appHandler: await loadCollection(),
      params: { assistantId: setup.assistant.id },
      method: 'POST',
      headers: setup.authHeaders,
      body: {
        openapiSpec: openapiSpec({ name: 'delegate' }),
        handler: {
          type: HandlerType.ASSISTANT,
          assistantHandler: { assistantId: foreign.assistant.id },
        },
      },
    })

    assert.strictEqual(status, 500)
    const count = await prisma.function.count({
      where: { assistantId: setup.assistant.id },
    })
    assert.strictEqual(count, 0)
  })
})

describe('/api/assistants/[assistantId]/functions/[functionId]', () => {
  const createFunction = async ({
    setup,
  }: {
    setup: Awaited<ReturnType<typeof createTestAssistantSetup>>
  }) => {
    const { json } = await call({
      appHandler: await loadCollection(),
      params: { assistantId: setup.assistant.id },
      method: 'POST',
      headers: setup.authHeaders,
      body: {
        openapiSpec: openapiSpec({ name: 'original' }),
        handler: {
          type: HandlerType.REQUEST,
          requestHandler: {
            method: MethodType.GET,
            url: `https://example.com/original/${setup.assistant.id}`,
            headers: '{}',
            body: '{}',
          },
        },
      },
    })
    return json.function as { id: string }
  }

  it('gets a single function', async () => {
    const setup = await createTestAssistantSetup()
    const fn = await createFunction({ setup })

    const { status, json } = await call({
      appHandler: await loadDetail(),
      params: { assistantId: setup.assistant.id, functionId: fn.id },
      method: 'GET',
      headers: setup.authHeaders,
    })

    assert.strictEqual(status, 200)
    assert.strictEqual(json.function.id, fn.id)
    assert.strictEqual(json.function.openapiSpec.name, 'original')
    assert.deepStrictEqual(json.function.handler, {
      type: HandlerType.REQUEST,
      requestHandler: {
        method: MethodType.GET,
        url: `https://example.com/original/${setup.assistant.id}`,
        headers: {},
        body: {},
      },
    })
  })

  it('returns 400 for an unknown function of an owned assistant', async () => {
    const setup = await createTestAssistantSetup()

    for (const method of ['GET', 'DELETE']) {
      const { status, json } = await call({
        appHandler: await loadDetail(),
        params: { assistantId: setup.assistant.id, functionId: randomUUID() },
        method,
        headers: setup.authHeaders,
      })
      assert.strictEqual(status, 400)
      assert.deepStrictEqual(json, { error: 'No function found' })
    }
  })

  it('replaces the handler of every type on PATCH', async () => {
    const setup = await createTestAssistantSetup()
    const target = await createTestAssistant({
      data: {
        workspaceId: setup.workspace.id,
        modelProviderId: setup.modelProvider.id,
      },
    })
    const fn = await createFunction({ setup })

    for (const handlerCase of handlerCases({ assistantId: target.id })) {
      const { status, json } = await call({
        appHandler: await loadDetail(),
        params: { assistantId: setup.assistant.id, functionId: fn.id },
        method: 'PATCH',
        headers: setup.authHeaders,
        body: {
          openapiSpec: openapiSpec({ name: `patched_${handlerCase.type}` }),
          handler: { type: handlerCase.type, ...handlerCase.input },
        },
      })

      assert.strictEqual(status, 200, handlerCase.type)
      assert.strictEqual(json.function.id, fn.id)
      assert.strictEqual(
        json.function.openapiSpec.name,
        `patched_${handlerCase.type}`,
      )
      assert.deepStrictEqual(json.function.handler, {
        type: handlerCase.type,
        ...handlerCase.expected,
      })
    }

    const handlers = await prisma.handler.findMany({
      where: { functionId: fn.id },
    })
    assert.deepStrictEqual(
      handlers.map(({ type }) => type),
      [HandlerType.DELETE_TASK],
    )
    const requestHandlers = await prisma.requestHandler.count({
      where: { url: `https://example.com/original/${setup.assistant.id}` },
    })
    assert.strictEqual(requestHandlers, 0)
  })

  it('rejects invalid PATCH payloads and unknown functions', async () => {
    const setup = await createTestAssistantSetup()
    const fn = await createFunction({ setup })

    const invalid = await call({
      appHandler: await loadDetail(),
      params: { assistantId: setup.assistant.id, functionId: fn.id },
      method: 'PATCH',
      headers: setup.authHeaders,
      body: { openapiSpec: '{}', handler: { type: HandlerType.REQUEST } },
    })
    assert.strictEqual(invalid.status, 400)
    assert.deepStrictEqual(invalid.json, { error: 'Invalid payload' })

    const unknown = await call({
      appHandler: await loadDetail(),
      params: { assistantId: setup.assistant.id, functionId: randomUUID() },
      method: 'PATCH',
      headers: setup.authHeaders,
      body: {
        openapiSpec: '{}',
        handler: {
          type: HandlerType.LIST_TASKS,
          listTasksHandler: { keyTemplate: '' },
        },
      },
    })
    assert.strictEqual(unknown.status, 400)
    assert.deepStrictEqual(unknown.json, { error: 'No function found' })

    const stored = await prisma.function.findUniqueOrThrow({
      where: { id: fn.id },
      include: { handler: true },
    })
    assert.strictEqual(stored.handler?.type, HandlerType.REQUEST)
  })

  it('keeps the old handler when the replacement fails', async () => {
    const setup = await createTestAssistantSetup()
    const foreign = await createTestAssistantSetup()
    const fn = await createFunction({ setup })

    const { status } = await call({
      appHandler: await loadDetail(),
      params: { assistantId: setup.assistant.id, functionId: fn.id },
      method: 'PATCH',
      headers: setup.authHeaders,
      body: {
        openapiSpec: openapiSpec({ name: 'delegate' }),
        handler: {
          type: HandlerType.ASSISTANT,
          assistantHandler: { assistantId: foreign.assistant.id },
        },
      },
    })

    assert.strictEqual(status, 500)
    const stored = await prisma.function.findUniqueOrThrow({
      where: { id: fn.id },
      include: { handler: true },
    })
    assert.strictEqual(stored.handler?.type, HandlerType.REQUEST)
  })

  it('deletes a function and its handler', async () => {
    const setup = await createTestAssistantSetup()
    const fn = await createFunction({ setup })

    const { status, json } = await call({
      appHandler: await loadDetail(),
      params: { assistantId: setup.assistant.id, functionId: fn.id },
      method: 'DELETE',
      headers: setup.authHeaders,
    })

    assert.strictEqual(status, 200)
    // The DELETE route returns the deleted function under `mcpServer`.
    assert.strictEqual(json.mcpServer.id, fn.id)
    assert.strictEqual(json.mcpServer.handler.type, HandlerType.REQUEST)
    assert.strictEqual(json.function, undefined)

    const [storedFn, storedHandler] = await Promise.all([
      prisma.function.findUnique({ where: { id: fn.id } }),
      prisma.handler.findFirst({ where: { functionId: fn.id } }),
    ])
    assert.strictEqual(storedFn, null)
    assert.strictEqual(storedHandler, null)
  })
})
