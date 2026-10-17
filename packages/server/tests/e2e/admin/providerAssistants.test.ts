import { testApiHandler } from 'next-test-api-route-handler'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import { ApiKeyType, ModelProviderType, Prisma } from '@prisma/client'
import { createTestWorkspace } from '../../lib/workspaces/createTestWorkspace'
import { createTestApiKey } from '../../lib/apiKeys/createTestApiKey'
import { createTestModelProvider } from '../../lib/modelProviders/createTestModelProvider'
import { startFakeProviderApi } from '../../lib/providerApi/startFakeProviderApi'
import { redirectExternalFetch } from '../../lib/providerApi/redirectExternalFetch'
import { isolateProviderEnv } from '../../lib/providerApi/isolateProviderEnv'
import { corsHeadersOf } from '../../lib/http/corsHeadersOf'

const importAssistants = () =>
  import('../../../src/app/api/providers/[modelProviderId]/assistants/route')

const createWorkspaceWithPrivateKey = async () => {
  const workspace = await createTestWorkspace()
  const privateKey = await createTestApiKey({
    data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
  })
  return {
    workspace,
    headers: { Authorization: `Bearer ${privateKey.value}` },
  }
}

const fetchAssistants = async ({
  modelProviderId,
  headers,
  method = 'GET',
}: {
  modelProviderId: string
  headers?: Record<string, string>
  method?: string
}) => {
  const appHandler = await importAssistants()
  let result: { status: number; body: string; headers: Headers } = {
    status: 0,
    body: '',
    headers: new Headers(),
  }

  await testApiHandler({
    appHandler,
    params: { modelProviderId },
    test: async ({ fetch }) => {
      const response = await fetch({ method, headers })
      result = {
        status: response.status,
        body: await response.text(),
        headers: response.headers,
      }
    },
  })

  return result
}

const storedAssistant = {
  id: 'asst_fake_1',
  model: 'gpt-4o-mini',
  name: 'Support',
  description: 'Answers support questions',
  instructions: 'Be helpful.',
  tools: [{ type: 'code_interpreter' }],
}

describe('/api/providers/[modelProviderId]/assistants', () => {
  let fakeApi: Awaited<ReturnType<typeof startFakeProviderApi>>
  let restoreFetch: () => void
  let restoreEnv: () => void

  before(async () => {
    fakeApi = await startFakeProviderApi({ assistants: [storedAssistant] })
    restoreFetch = redirectExternalFetch({ origin: fakeApi.origin })
    restoreEnv = isolateProviderEnv()
  })

  after(async () => {
    restoreEnv()
    restoreFetch()
    await fakeApi.close()
  })

  const listAssistantsFor = async ({
    data,
  }: {
    data: Omit<Partial<Prisma.ModelProviderUncheckedCreateInput>, 'workspaceId'>
  }) => {
    const { workspace, headers } = await createWorkspaceWithPrivateKey()
    const provider = await createTestModelProvider({
      data: { workspaceId: workspace.id, ...data },
    })
    const requestCount = fakeApi.requests.length
    const response = await fetchAssistants({
      modelProviderId: provider.id,
      headers,
    })

    return {
      response,
      body: JSON.parse(response.body),
      requests: fakeApi.requests.slice(requestCount),
    }
  }

  // The first test loads the route module, so it covers listing,
  // serialization and the CORS preflight answer.
  it('lists OpenAI assistants with the provider key and answers preflight requests', async () => {
    const { response, body, requests } = await listAssistantsFor({
      data: { type: ModelProviderType.OPENAI, apiKey: 'sk-openai' },
    })

    assert.strictEqual(response.status, 200)
    assert.deepStrictEqual(body, {
      storageProviderAssistants: [storedAssistant],
    })
    assert.strictEqual(response.headers.get('access-control-allow-origin'), '*')
    assert.deepStrictEqual(
      requests.map(({ path, search }) => ({ path, search })),
      [{ path: '/api.openai.com/v1/assistants', search: '?limit=100' }],
    )
    assert.strictEqual(requests[0].headers.authorization, 'Bearer sk-openai')

    const options = await fetchAssistants({
      modelProviderId: randomUUID(),
      method: 'OPTIONS',
    })
    assert.strictEqual(options.status, 200)
    assert.deepStrictEqual(JSON.parse(options.body), {})
    assert.deepStrictEqual(corsHeadersOf({ headers: options.headers }), {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'access-control-allow-headers':
        'Content-Type, Authorization, X-Requested-With, Accept',
    })
  })

  it('rejects missing authorization, non-private keys and foreign providers', async () => {
    const { workspace, headers } = await createWorkspaceWithPrivateKey()
    const publicKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
    })
    const provider = await createTestModelProvider({
      data: { workspaceId: workspace.id },
    })
    const otherWorkspace = await createTestWorkspace()
    const foreign = await createTestModelProvider({
      data: { workspaceId: otherWorkspace.id },
    })
    const requestCount = fakeApi.requests.length

    const noAuth = await fetchAssistants({ modelProviderId: provider.id })
    assert.strictEqual(noAuth.status, 400)
    assert.deepStrictEqual(JSON.parse(noAuth.body), {
      error: 'No authorization header found',
    })

    const invalidKey = await fetchAssistants({
      modelProviderId: provider.id,
      headers: { Authorization: `Bearer ${publicKey.value}` },
    })
    assert.strictEqual(invalidKey.status, 400)
    assert.deepStrictEqual(JSON.parse(invalidKey.body), {
      error: 'Invalid api key',
    })

    for (const modelProviderId of [foreign.id, randomUUID()]) {
      const notFound = await fetchAssistants({ modelProviderId, headers })
      assert.strictEqual(notFound.status, 400)
      assert.deepStrictEqual(JSON.parse(notFound.body), {
        error: 'No provider found',
      })
    }

    assert.deepStrictEqual(fakeApi.requests.slice(requestCount), [])
  })

  it('lists Azure OpenAI assistants from the provider endpoint', async () => {
    const { response, body, requests } = await listAssistantsFor({
      data: {
        type: ModelProviderType.AZURE_OPENAI,
        apiKey: 'azure-key',
        endpoint: `${fakeApi.origin}/azure`,
      },
    })

    assert.strictEqual(response.status, 200)
    assert.deepStrictEqual(body, {
      storageProviderAssistants: [storedAssistant],
    })
    assert.deepStrictEqual(
      requests.map(({ path }) => path),
      ['/azure/openai/assistants'],
    )
    assert.strictEqual(requests[0].headers['api-key'], 'azure-key')
  })

  it('returns no assistants for incompletely configured providers', async () => {
    const providers = [
      { type: ModelProviderType.OPENAI, apiKey: '' },
      { type: ModelProviderType.AZURE_OPENAI, apiKey: '', endpoint: null },
      {
        type: ModelProviderType.AZURE_OPENAI,
        apiKey: 'azure-key',
        endpoint: null,
      },
    ]

    for (const data of providers) {
      const { response, body, requests } = await listAssistantsFor({ data })
      assert.strictEqual(response.status, 200)
      assert.deepStrictEqual(body, { storageProviderAssistants: [] })
      assert.deepStrictEqual(requests, [])
    }
  })

  it('returns no assistants for providers without assistant storage', async () => {
    const { response, body, requests } = await listAssistantsFor({
      data: {
        type: ModelProviderType.OLLAMA,
        apiKey: '',
        endpoint: `${fakeApi.origin}/ollama/v1`,
      },
    })

    assert.strictEqual(response.status, 200)
    assert.deepStrictEqual(body, { storageProviderAssistants: [] })
    assert.deepStrictEqual(requests, [])
  })

  it('returns no assistants when the provider rejects the listing', async (t) => {
    const failingApi = await startFakeProviderApi({ status: 401 })
    const consoleError = t.mock.method(console, 'error', () => {})

    try {
      const { response, body } = await listAssistantsFor({
        data: {
          type: ModelProviderType.AZURE_OPENAI,
          apiKey: 'revoked-key',
          endpoint: `${failingApi.origin}/azure`,
        },
      })

      assert.strictEqual(response.status, 200)
      assert.deepStrictEqual(body, { storageProviderAssistants: [] })
      assert.deepStrictEqual(
        failingApi.requests.map(({ path }) => path),
        ['/azure/openai/assistants'],
      )
      // The provider error is logged and swallowed.
      assert.strictEqual(consoleError.mock.callCount(), 1)
      const [loggedError] = consoleError.mock.calls[0].arguments
      assert.ok(loggedError instanceof Error)
      assert.strictEqual(
        (loggedError as Error & { status: number }).status,
        401,
      )
    } finally {
      await failingApi.close()
    }
  })
})
