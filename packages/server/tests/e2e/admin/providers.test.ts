import { testApiHandler } from 'next-test-api-route-handler'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { describe, it } from 'node:test'
import { ApiKeyType, ModelProviderType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTestWorkspace } from '../../lib/workspaces/createTestWorkspace'
import { createTestApiKey } from '../../lib/apiKeys/createTestApiKey'
import { createTestModelProvider } from '../../lib/modelProviders/createTestModelProvider'
import { createTestAssistant } from '../../lib/assistants/createTestAssistant'
import { corsHeadersOf } from '../../lib/http/corsHeadersOf'

const importCollection = () => import('../../../src/app/api/providers/route')

const importMember = () =>
  import('../../../src/app/api/providers/[modelProviderId]/route')

const createWorkspaceWithPrivateKey = async () => {
  const workspace = await createTestWorkspace()
  const privateKey = await createTestApiKey({
    data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
  })
  return {
    workspace,
    privateKey,
    headers: { Authorization: `Bearer ${privateKey.value}` },
  }
}

const azureCredentials = {
  azureTenantId: 'tenant-id',
  azureClientId: 'client-id',
  azureClientSecret: 'client-secret',
}

describe('/api/providers', () => {
  // The first test loads the route module, so it covers creation, listing,
  // serialization and the CORS preflight answer.
  it('creates providers with defaults and with every field set, lists them and answers preflight requests', async () => {
    const { workspace, headers } = await createWorkspaceWithPrivateKey()
    const appHandler = await importCollection()

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const minimalResponse = await fetch({
          method: 'POST',
          headers,
          body: JSON.stringify({ type: ModelProviderType.ANTHROPIC }),
        })
        assert.strictEqual(minimalResponse.status, 200)
        const { provider: minimal } = await minimalResponse.json()
        const storedMinimal = await prisma.modelProvider.findUniqueOrThrow({
          where: { id: minimal.id },
        })
        assert.deepStrictEqual(minimal, {
          id: storedMinimal.id,
          type: ModelProviderType.ANTHROPIC,
          name: '',
          apiKey: '',
          endpoint: null,
          apiVersion: null,
          createdAt: storedMinimal.createdAt.toISOString(),
          updatedAt: storedMinimal.updatedAt.toISOString(),
        })
        assert.strictEqual(storedMinimal.workspaceId, workspace.id)
        assert.strictEqual(storedMinimal.azureTenantId, null)
        assert.strictEqual(storedMinimal.azureClientId, null)
        assert.strictEqual(storedMinimal.azureClientSecret, null)

        const fullResponse = await fetch({
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: ModelProviderType.AZURE_AI_PROJECT,
            name: 'Azure project',
            apiKey: 'secret',
            endpoint: 'https://example.services.ai.azure.com/api/projects/p',
            apiVersion: '2025-01-01',
            ...azureCredentials,
          }),
        })
        assert.strictEqual(fullResponse.status, 200)
        const { provider: full } = await fullResponse.json()
        const storedFull = await prisma.modelProvider.findUniqueOrThrow({
          where: { id: full.id },
        })
        assert.deepStrictEqual(full, {
          id: storedFull.id,
          type: ModelProviderType.AZURE_AI_PROJECT,
          name: 'Azure project',
          apiKey: 'secret',
          endpoint: 'https://example.services.ai.azure.com/api/projects/p',
          apiVersion: '2025-01-01',
          createdAt: storedFull.createdAt.toISOString(),
          updatedAt: storedFull.updatedAt.toISOString(),
          ...azureCredentials,
        })
        assert.strictEqual(storedFull.workspaceId, workspace.id)
        assert.strictEqual(storedFull.azureTenantId, 'tenant-id')
        assert.strictEqual(storedFull.azureClientId, 'client-id')
        assert.strictEqual(storedFull.azureClientSecret, 'client-secret')
        assert.strictEqual(
          fullResponse.headers.get('access-control-allow-origin'),
          '*',
        )

        const listResponse = await fetch({ method: 'GET', headers })
        assert.strictEqual(listResponse.status, 200)
        const { providers } = await listResponse.json()
        assert.deepStrictEqual(
          [...providers].sort((a, b) => a.name.localeCompare(b.name)),
          [minimal, full],
        )

        const optionsResponse = await fetch({ method: 'OPTIONS' })
        assert.strictEqual(optionsResponse.status, 200)
        assert.deepStrictEqual(await optionsResponse.json(), {})
        assert.deepStrictEqual(
          corsHeadersOf({ headers: optionsResponse.headers }),
          {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'access-control-allow-headers':
              'Content-Type, Authorization, X-Requested-With, Accept',
          },
        )
      },
    })
  })

  it('rejects missing authorization and non-private keys', async () => {
    const workspace = await createTestWorkspace()
    const publicKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
    })
    const appHandler = await importCollection()

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        for (const method of ['GET', 'POST']) {
          const body =
            method === 'POST'
              ? JSON.stringify({ type: ModelProviderType.OPENAI })
              : null

          const noAuth = await fetch({ method, body })
          assert.strictEqual(noAuth.status, 400)
          assert.deepStrictEqual(await noAuth.json(), {
            error: 'No authorization header found',
          })

          const invalidKey = await fetch({
            method,
            headers: { Authorization: `Bearer ${publicKey.value}` },
            body,
          })
          assert.strictEqual(invalidKey.status, 400)
          assert.deepStrictEqual(await invalidKey.json(), {
            error: 'Invalid api key',
          })
        }
      },
    })

    assert.strictEqual(
      await prisma.modelProvider.count({
        where: { workspaceId: workspace.id },
      }),
      0,
    )
  })

  it('lists workspace providers, exposing Azure credentials only for Azure AI Project', async () => {
    const { workspace, headers } = await createWorkspaceWithPrivateKey()
    const openaiProvider = await createTestModelProvider({
      data: {
        workspaceId: workspace.id,
        type: ModelProviderType.OPENAI,
        name: 'OpenAI',
        ...azureCredentials,
      },
    })
    const azureProvider = await createTestModelProvider({
      data: {
        workspaceId: workspace.id,
        type: ModelProviderType.AZURE_AI_PROJECT,
        name: 'Azure project',
        endpoint: 'https://example.services.ai.azure.com/api/projects/p',
        ...azureCredentials,
      },
    })
    const otherWorkspace = await createTestWorkspace()
    await createTestModelProvider({ data: { workspaceId: otherWorkspace.id } })
    const appHandler = await importCollection()

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET', headers })
        assert.strictEqual(response.status, 200)
        const { providers } = await response.json()
        const byId = new Map(
          providers.map((provider: { id: string }) => [provider.id, provider]),
        )

        assert.strictEqual(providers.length, 2)
        assert.deepStrictEqual(byId.get(openaiProvider.id), {
          id: openaiProvider.id,
          type: ModelProviderType.OPENAI,
          name: 'OpenAI',
          apiKey: openaiProvider.apiKey,
          endpoint: null,
          apiVersion: null,
          createdAt: openaiProvider.createdAt.toISOString(),
          updatedAt: openaiProvider.updatedAt.toISOString(),
        })
        assert.deepStrictEqual(byId.get(azureProvider.id), {
          id: azureProvider.id,
          type: ModelProviderType.AZURE_AI_PROJECT,
          name: 'Azure project',
          apiKey: azureProvider.apiKey,
          endpoint: azureProvider.endpoint,
          apiVersion: null,
          createdAt: azureProvider.createdAt.toISOString(),
          updatedAt: azureProvider.updatedAt.toISOString(),
          ...azureCredentials,
        })
      },
    })
  })

  it('rejects invalid provider payloads', async () => {
    const { workspace, headers } = await createWorkspaceWithPrivateKey()
    const appHandler = await importCollection()

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        for (const body of [{}, { type: 'NOT_A_PROVIDER' }]) {
          const response = await fetch({
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          })
          assert.strictEqual(response.status, 400)
          assert.deepStrictEqual(await response.json(), {
            error: 'Invalid payload',
          })
        }
      },
    })

    assert.strictEqual(
      await prisma.modelProvider.count({
        where: { workspaceId: workspace.id },
      }),
      0,
    )
  })
})

describe('/api/providers/[modelProviderId]', () => {
  // The first test loads the route module, so it also checks the CORS
  // preflight answer.
  it('answers preflight requests and rejects missing authorization, invalid keys and invalid ids', async () => {
    const { workspace, headers } = await createWorkspaceWithPrivateKey()
    const provider = await createTestModelProvider({
      data: { workspaceId: workspace.id, name: 'Untouched' },
    })
    const publicKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
    })
    const appHandler = await importMember()
    const methods = ['GET', 'PATCH', 'DELETE']
    const bodyFor = ({ method }: { method: string }) =>
      method === 'PATCH' ? JSON.stringify({ name: 'Changed' }) : null

    await testApiHandler({
      appHandler,
      params: { modelProviderId: provider.id },
      test: async ({ fetch }) => {
        const optionsResponse = await fetch({ method: 'OPTIONS' })
        assert.strictEqual(optionsResponse.status, 200)
        assert.deepStrictEqual(await optionsResponse.json(), {})
        assert.deepStrictEqual(
          corsHeadersOf({ headers: optionsResponse.headers }),
          {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'access-control-allow-headers':
              'Content-Type, Authorization, X-Requested-With, Accept',
          },
        )

        for (const method of methods) {
          const noAuth = await fetch({ method, body: bodyFor({ method }) })
          assert.strictEqual(noAuth.status, 400)
          assert.deepStrictEqual(await noAuth.json(), {
            error: 'No authorization header found',
          })

          const invalidKey = await fetch({
            method,
            headers: { Authorization: `Bearer ${publicKey.value}` },
            body: bodyFor({ method }),
          })
          assert.strictEqual(invalidKey.status, 400)
          assert.deepStrictEqual(await invalidKey.json(), {
            error: 'Invalid api key',
          })
        }
      },
    })

    await testApiHandler({
      appHandler,
      params: { modelProviderId: 'not-a-uuid' },
      test: async ({ fetch }) => {
        for (const method of methods) {
          const response = await fetch({
            method,
            headers,
            body: bodyFor({ method }),
          })
          assert.strictEqual(response.status, 400)
          assert.deepStrictEqual(await response.json(), {
            error: 'Invalid provider id',
          })
        }
      },
    })

    const stored = await prisma.modelProvider.findUniqueOrThrow({
      where: { id: provider.id },
    })
    assert.strictEqual(stored.name, 'Untouched')
  })

  it('reads and patches a provider field by field', async () => {
    const { workspace, headers } = await createWorkspaceWithPrivateKey()
    const provider = await createTestModelProvider({
      data: {
        workspaceId: workspace.id,
        type: ModelProviderType.OPENAI,
        name: 'Before',
        apiKey: 'old-key',
      },
    })
    const appHandler = await importMember()
    const storedProvider = () =>
      prisma.modelProvider.findUniqueOrThrow({ where: { id: provider.id } })

    await testApiHandler({
      appHandler,
      params: { modelProviderId: provider.id },
      test: async ({ fetch }) => {
        const getResponse = await fetch({ method: 'GET', headers })
        assert.strictEqual(getResponse.status, 200)
        assert.deepStrictEqual(await getResponse.json(), {
          provider: {
            id: provider.id,
            type: ModelProviderType.OPENAI,
            name: 'Before',
            apiKey: 'old-key',
            endpoint: null,
            apiVersion: null,
            createdAt: provider.createdAt.toISOString(),
            updatedAt: provider.updatedAt.toISOString(),
          },
        })
        assert.strictEqual(
          getResponse.headers.get('access-control-allow-origin'),
          '*',
        )

        const invalidPatch = await fetch({
          method: 'PATCH',
          headers,
          body: JSON.stringify({ type: 'NOT_A_PROVIDER' }),
        })
        assert.strictEqual(invalidPatch.status, 400)
        assert.deepStrictEqual(await invalidPatch.json(), {
          error: 'Invalid payload',
        })

        // An empty payload changes nothing.
        const emptyPatch = await fetch({
          method: 'PATCH',
          headers,
          body: JSON.stringify({}),
        })
        assert.strictEqual(emptyPatch.status, 200)
        const unchanged = await storedProvider()
        assert.deepStrictEqual(await emptyPatch.json(), {
          provider: {
            id: provider.id,
            type: ModelProviderType.OPENAI,
            name: 'Before',
            apiKey: 'old-key',
            endpoint: null,
            apiVersion: null,
            createdAt: provider.createdAt.toISOString(),
            updatedAt: unchanged.updatedAt.toISOString(),
          },
        })

        const fullPatch = await fetch({
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            type: ModelProviderType.AZURE_AI_PROJECT,
            name: 'After',
            apiKey: 'new-key',
            endpoint: 'https://example.services.ai.azure.com/api/projects/p',
            apiVersion: '2025-01-01',
            ...azureCredentials,
          }),
        })
        assert.strictEqual(fullPatch.status, 200)
        const patched = await storedProvider()
        assert.deepStrictEqual(await fullPatch.json(), {
          provider: {
            id: provider.id,
            type: ModelProviderType.AZURE_AI_PROJECT,
            name: 'After',
            apiKey: 'new-key',
            endpoint: 'https://example.services.ai.azure.com/api/projects/p',
            apiVersion: '2025-01-01',
            createdAt: provider.createdAt.toISOString(),
            updatedAt: patched.updatedAt.toISOString(),
            ...azureCredentials,
          },
        })
        assert.strictEqual(
          fullPatch.headers.get('access-control-allow-origin'),
          '*',
        )

        const clearPatch = await fetch({
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            endpoint: null,
            apiVersion: null,
            azureTenantId: null,
            azureClientId: null,
            azureClientSecret: null,
          }),
        })
        assert.strictEqual(clearPatch.status, 200)
        const cleared = await storedProvider()
        assert.deepStrictEqual(await clearPatch.json(), {
          provider: {
            id: provider.id,
            type: ModelProviderType.AZURE_AI_PROJECT,
            name: 'After',
            apiKey: 'new-key',
            endpoint: null,
            apiVersion: null,
            createdAt: provider.createdAt.toISOString(),
            updatedAt: cleared.updatedAt.toISOString(),
            azureTenantId: null,
            azureClientId: null,
            azureClientSecret: null,
          },
        })
      },
    })
  })

  it('does not expose providers of other workspaces', async () => {
    const { headers } = await createWorkspaceWithPrivateKey()
    const otherWorkspace = await createTestWorkspace()
    const foreign = await createTestModelProvider({
      data: { workspaceId: otherWorkspace.id, name: 'Foreign' },
    })
    const appHandler = await importMember()

    for (const modelProviderId of [foreign.id, randomUUID()]) {
      await testApiHandler({
        appHandler,
        params: { modelProviderId },
        test: async ({ fetch }) => {
          for (const method of ['GET', 'PATCH', 'DELETE']) {
            const response = await fetch({
              method,
              headers,
              body:
                method === 'PATCH' ? JSON.stringify({ name: 'Hijack' }) : null,
            })
            assert.strictEqual(response.status, 400)
            assert.deepStrictEqual(await response.json(), {
              error: 'No provider found',
            })
          }
        },
      })
    }

    const stored = await prisma.modelProvider.findUniqueOrThrow({
      where: { id: foreign.id },
    })
    assert.strictEqual(stored.name, 'Foreign')
  })

  it('refuses to delete a provider used by an assistant', async () => {
    const { workspace, headers } = await createWorkspaceWithPrivateKey()
    const provider = await createTestModelProvider({
      data: { workspaceId: workspace.id },
    })
    await createTestAssistant({
      data: { workspaceId: workspace.id, modelProviderId: provider.id },
    })
    const appHandler = await importMember()

    await testApiHandler({
      appHandler,
      params: { modelProviderId: provider.id },
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'DELETE', headers })
        assert.strictEqual(response.status, 400)
        assert.deepStrictEqual(await response.json(), {
          error: 'Provider in use',
        })
      },
    })

    assert.ok(
      await prisma.modelProvider.findUnique({ where: { id: provider.id } }),
    )
  })

  it('deletes an unused provider', async () => {
    const { workspace, headers } = await createWorkspaceWithPrivateKey()
    const provider = await createTestModelProvider({
      data: { workspaceId: workspace.id, name: 'Disposable' },
    })
    const appHandler = await importMember()

    await testApiHandler({
      appHandler,
      params: { modelProviderId: provider.id },
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'DELETE', headers })
        assert.strictEqual(response.status, 200)
        assert.deepStrictEqual(await response.json(), {
          provider: {
            id: provider.id,
            type: provider.type,
            name: 'Disposable',
            apiKey: provider.apiKey,
            endpoint: provider.endpoint,
            apiVersion: provider.apiVersion,
            createdAt: provider.createdAt.toISOString(),
            updatedAt: provider.updatedAt.toISOString(),
          },
        })
        assert.strictEqual(
          response.headers.get('access-control-allow-origin'),
          '*',
        )
      },
    })

    assert.strictEqual(
      await prisma.modelProvider.findUnique({ where: { id: provider.id } }),
      null,
    )
  })
})
