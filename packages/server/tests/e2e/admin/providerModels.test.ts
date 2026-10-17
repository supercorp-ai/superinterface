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

const importModels = () =>
  import('../../../src/app/api/providers/[modelProviderId]/models/route')

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

const fetchModels = async ({
  modelProviderId,
  headers,
  method = 'GET',
}: {
  modelProviderId: string
  headers?: Record<string, string>
  method?: string
}) => {
  const appHandler = await importModels()
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

describe('/api/providers/[modelProviderId]/models', () => {
  let fakeApi: Awaited<ReturnType<typeof startFakeProviderApi>>
  let restoreFetch: () => void
  let restoreEnv: () => void

  before(async () => {
    fakeApi = await startFakeProviderApi({ models: ['alpha', 'beta'] })
    restoreFetch = redirectExternalFetch({ origin: fakeApi.origin })
    restoreEnv = isolateProviderEnv({
      env: {
        // groq-sdk uses node-fetch, so it is pointed at the fake directly.
        GROQ_BASE_URL: `${fakeApi.origin}/api.groq.com`,
        COMMUNITY_TEST_GROQ_API_KEY: 'community-groq-key',
        // Any Azure AD token request would fail locally instead of leaving.
        AZURE_AUTHORITY_HOST: 'https://127.0.0.1:1',
      },
    })
  })

  after(async () => {
    restoreEnv()
    restoreFetch()
    await fakeApi.close()
  })

  const listModelsFor = async ({
    data,
  }: {
    data: Omit<Partial<Prisma.ModelProviderUncheckedCreateInput>, 'workspaceId'>
  }) => {
    const { workspace, headers } = await createWorkspaceWithPrivateKey()
    const provider = await createTestModelProvider({
      data: { workspaceId: workspace.id, ...data },
    })
    const requestCount = fakeApi.requests.length
    const response = await fetchModels({
      modelProviderId: provider.id,
      headers,
    })

    return {
      provider,
      response,
      requests: fakeApi.requests.slice(requestCount),
    }
  }

  // The first test loads the route module, so it covers listing,
  // serialization and the CORS preflight answer.
  it('lists OpenAI models with the provider key and answers preflight requests', async () => {
    const { response, requests } = await listModelsFor({
      data: { type: ModelProviderType.OPENAI, apiKey: 'sk-openai' },
    })

    assert.strictEqual(response.status, 200)
    assert.deepStrictEqual(JSON.parse(response.body), {
      models: [{ id: 'alpha' }, { id: 'beta' }],
    })
    assert.strictEqual(response.headers.get('access-control-allow-origin'), '*')
    assert.deepStrictEqual(
      requests.map(({ path }) => path),
      ['/api.openai.com/v1/models'],
    )
    assert.strictEqual(requests[0].headers.authorization, 'Bearer sk-openai')

    const options = await fetchModels({
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

    const noAuth = await fetchModels({ modelProviderId: provider.id })
    assert.strictEqual(noAuth.status, 400)
    assert.deepStrictEqual(JSON.parse(noAuth.body), {
      error: 'No authorization header found',
    })

    const invalidKey = await fetchModels({
      modelProviderId: provider.id,
      headers: { Authorization: `Bearer ${publicKey.value}` },
    })
    assert.strictEqual(invalidKey.status, 400)
    assert.deepStrictEqual(JSON.parse(invalidKey.body), {
      error: 'Invalid api key',
    })

    for (const modelProviderId of [foreign.id, randomUUID()]) {
      const notFound = await fetchModels({ modelProviderId, headers })
      assert.strictEqual(notFound.status, 400)
      assert.deepStrictEqual(JSON.parse(notFound.body), {
        error: 'No provider found',
      })
    }
  })

  it('lists Azure OpenAI models against the provider endpoint and api version', async () => {
    const custom = await listModelsFor({
      data: {
        type: ModelProviderType.AZURE_OPENAI,
        apiKey: 'azure-key',
        endpoint: `${fakeApi.origin}/azure-custom`,
        apiVersion: '2024-10-21',
      },
    })

    assert.strictEqual(custom.response.status, 200)
    assert.deepStrictEqual(JSON.parse(custom.response.body), {
      models: [{ id: 'alpha' }, { id: 'beta' }],
    })
    assert.deepStrictEqual(
      custom.requests.map(({ path, search }) => ({ path, search })),
      [
        {
          path: '/azure-custom/openai/models',
          search: '?api-version=2024-10-21',
        },
      ],
    )
    assert.strictEqual(custom.requests[0].headers['api-key'], 'azure-key')

    const fallback = await listModelsFor({
      data: {
        type: ModelProviderType.AZURE_OPENAI,
        apiKey: 'azure-key',
        endpoint: `${fakeApi.origin}/azure-default`,
        apiVersion: null,
      },
    })

    assert.strictEqual(fallback.response.status, 200)
    assert.deepStrictEqual(
      fallback.requests.map(({ path, search }) => ({ path, search })),
      [
        {
          path: '/azure-default/openai/models',
          search: '?api-version=2025-04-01-preview',
        },
      ],
    )
  })

  it('lists Anthropic models', async () => {
    const { response, requests } = await listModelsFor({
      data: { type: ModelProviderType.ANTHROPIC, apiKey: 'sk-ant' },
    })

    assert.strictEqual(response.status, 200)
    assert.deepStrictEqual(JSON.parse(response.body), {
      models: [{ id: 'alpha' }, { id: 'beta' }],
    })
    assert.deepStrictEqual(
      requests.map(({ path }) => path),
      ['/api.anthropic.com/v1/models'],
    )
    assert.strictEqual(requests[0].headers['x-api-key'], 'sk-ant')
  })

  it('lists Groq models, falling back to the community key', async () => {
    const own = await listModelsFor({
      data: { type: ModelProviderType.GROQ, apiKey: 'gsk-own' },
    })

    assert.strictEqual(own.response.status, 200)
    assert.deepStrictEqual(JSON.parse(own.response.body), {
      models: [{ id: 'alpha' }, { id: 'beta' }],
    })
    assert.deepStrictEqual(
      own.requests.map(({ path }) => path),
      ['/api.groq.com/openai/v1/models'],
    )
    assert.strictEqual(own.requests[0].headers.authorization, 'Bearer gsk-own')

    const community = await listModelsFor({
      data: { type: ModelProviderType.GROQ, apiKey: '' },
    })

    assert.strictEqual(community.response.status, 200)
    assert.strictEqual(
      community.requests[0].headers.authorization,
      'Bearer community-groq-key',
    )
  })

  it('lists Mistral models', async () => {
    const { response, requests } = await listModelsFor({
      data: { type: ModelProviderType.MISTRAL, apiKey: 'mistral-key' },
    })

    assert.strictEqual(response.status, 200)
    assert.deepStrictEqual(
      JSON.parse(response.body).models.map(({ id }: { id: string }) => id),
      ['alpha', 'beta'],
    )
    assert.deepStrictEqual(
      requests.map(({ path }) => path),
      ['/api.mistral.ai/v1/models'],
    )
    assert.strictEqual(requests[0].headers.authorization, 'Bearer mistral-key')
  })

  it('lists Together models', async () => {
    const { response, requests } = await listModelsFor({
      data: { type: ModelProviderType.TOGETHER, apiKey: 'together-key' },
    })

    assert.strictEqual(response.status, 200)
    assert.deepStrictEqual(JSON.parse(response.body), {
      models: [{ id: 'alpha' }, { id: 'beta' }],
    })
    assert.deepStrictEqual(
      requests.map(({ path }) => path),
      ['/api.together.xyz/v1/models'],
    )
    assert.strictEqual(requests[0].headers.authorization, 'Bearer together-key')
  })

  it('lists Open Router models', async () => {
    const { response, requests } = await listModelsFor({
      data: { type: ModelProviderType.OPEN_ROUTER, apiKey: 'or-key' },
    })

    assert.strictEqual(response.status, 200)
    assert.deepStrictEqual(JSON.parse(response.body), {
      models: [{ id: 'alpha' }, { id: 'beta' }],
    })
    assert.deepStrictEqual(
      requests.map(({ path }) => path),
      ['/openrouter.ai/api/v1/models'],
    )
    assert.strictEqual(requests[0].headers.authorization, 'Bearer or-key')
  })

  it('lists Google models', async () => {
    const { response, requests } = await listModelsFor({
      data: { type: ModelProviderType.GOOGLE, apiKey: 'google-key' },
    })

    assert.strictEqual(response.status, 200)
    assert.deepStrictEqual(JSON.parse(response.body), {
      models: [{ id: 'models/alpha' }, { id: 'models/beta' }],
    })
    assert.deepStrictEqual(
      requests.map(({ path }) => path),
      ['/generativelanguage.googleapis.com/v1beta/models'],
    )
    assert.strictEqual(requests[0].headers['x-goog-api-key'], 'google-key')
  })

  it('lists Ollama models from the provider endpoint', async () => {
    const { response, requests } = await listModelsFor({
      data: {
        type: ModelProviderType.OLLAMA,
        apiKey: '',
        endpoint: `${fakeApi.origin}/ollama/v1`,
      },
    })

    assert.strictEqual(response.status, 200)
    assert.deepStrictEqual(JSON.parse(response.body), {
      models: [{ id: 'alpha' }, { id: 'beta' }],
    })
    assert.deepStrictEqual(
      requests.map(({ path }) => path),
      ['/ollama/v1/models'],
    )
  })

  it('sends Ollama providers without an endpoint to the default OpenAI base URL', async () => {
    const { response, requests } = await listModelsFor({
      data: { type: ModelProviderType.OLLAMA, apiKey: '', endpoint: null },
    })

    assert.strictEqual(response.status, 200)
    assert.deepStrictEqual(JSON.parse(response.body), {
      models: [{ id: 'alpha' }, { id: 'beta' }],
    })
    assert.deepStrictEqual(
      requests.map(({ path }) => path),
      ['/api.openai.com/v1/models'],
    )
    assert.strictEqual(requests[0].headers.authorization, 'Bearer ollama')
  })

  it('returns an empty list when the provider has no models', async () => {
    const emptyApi = await startFakeProviderApi({ models: [] })

    try {
      const { response } = await listModelsFor({
        data: {
          type: ModelProviderType.OLLAMA,
          apiKey: '',
          endpoint: `${emptyApi.origin}/v1`,
        },
      })

      assert.strictEqual(response.status, 200)
      assert.deepStrictEqual(JSON.parse(response.body), { models: [] })
      assert.deepStrictEqual(
        emptyApi.requests.map(({ path }) => path),
        ['/v1/models'],
      )
    } finally {
      await emptyApi.close()
    }
  })

  it('lists the built-in Perplexity and Humiris models without calling out', async () => {
    const perplexity = await listModelsFor({
      data: { type: ModelProviderType.PERPLEXITY, apiKey: 'pplx-key' },
    })

    assert.strictEqual(perplexity.response.status, 200)
    const perplexityIds = JSON.parse(perplexity.response.body).models.map(
      ({ id }: { id: string }) => id,
    )
    assert.ok(perplexityIds.includes('sonar'))
    assert.deepStrictEqual(perplexity.requests, [])

    const humiris = await listModelsFor({
      data: { type: ModelProviderType.HUMIRIS, apiKey: 'humiris-key' },
    })

    assert.strictEqual(humiris.response.status, 200)
    assert.deepStrictEqual(JSON.parse(humiris.response.body), {
      models: [{ id: 'Humiris/humiris-moai' }],
    })
    assert.deepStrictEqual(humiris.requests, [])
  })

  it('fails when the provider rejects the model listing', async () => {
    const failingApi = await startFakeProviderApi({ status: 401 })

    try {
      const { response } = await listModelsFor({
        data: {
          type: ModelProviderType.OLLAMA,
          apiKey: '',
          endpoint: `${failingApi.origin}/v1`,
        },
      })

      assert.strictEqual(response.status, 500)
      assert.deepStrictEqual(
        failingApi.requests.map(({ path }) => path).slice(0, 1),
        ['/v1/models'],
      )

      // The provider error is replaced with a generic one for the caller.
      const { workspace, headers } = await createWorkspaceWithPrivateKey()
      const provider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.OLLAMA,
          apiKey: '',
          endpoint: `${failingApi.origin}/v1`,
        },
      })
      await assert.rejects(
        testApiHandler({
          appHandler: await importModels(),
          params: { modelProviderId: provider.id },
          rejectOnHandlerError: true,
          test: async ({ fetch }) => {
            await fetch({ method: 'GET', headers })
          },
        }),
        { message: 'Failed to load models from AI provider.' },
      )
    } finally {
      await failingApi.close()
    }
  })

  it('requires every Azure AI Project credential', async () => {
    const credentials = {
      azureTenantId: 'tenant-id',
      azureClientId: 'client-id',
      azureClientSecret: 'client-secret',
      endpoint: `${fakeApi.origin}/azure-project`,
    }

    for (const missing of Object.keys(credentials)) {
      const { response, requests } = await listModelsFor({
        data: {
          type: ModelProviderType.AZURE_AI_PROJECT,
          ...credentials,
          [missing]: null,
        },
      })

      assert.strictEqual(response.status, 500, missing)
      assert.deepStrictEqual(requests, [])
    }
  })

  it('refuses to send Azure AI Project credentials to a non-TLS endpoint', async () => {
    const { workspace, headers } = await createWorkspaceWithPrivateKey()
    const provider = await createTestModelProvider({
      data: {
        workspaceId: workspace.id,
        type: ModelProviderType.AZURE_AI_PROJECT,
        azureTenantId: 'tenant-id',
        azureClientId: 'client-id',
        azureClientSecret: 'client-secret',
        endpoint: `${fakeApi.origin}/azure-project`,
      },
    })
    const requestCount = fakeApi.requests.length

    // The second request reuses the cached Azure AI Project client.
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetchModels({
        modelProviderId: provider.id,
        headers,
      })
      assert.strictEqual(response.status, 500)
    }

    assert.deepStrictEqual(fakeApi.requests.slice(requestCount), [])
  })
})
