import { testApiHandler } from 'next-test-api-route-handler'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { describe, it } from 'node:test'
import { ApiKeyType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTestWorkspace } from '../../lib/workspaces/createTestWorkspace'
import { createTestApiKey } from '../../lib/apiKeys/createTestApiKey'
import { createTestOrganization } from '../../lib/organizations/createTestOrganization'
import { createTestOrganizationApiKey } from '../../lib/organizationApiKeys/createTestOrganizationApiKey'
import { corsHeadersOf } from '../../lib/http/corsHeadersOf'

const importCollection = () => import('../../../src/app/api/api-keys/route')

const createWorkspaceWithPrivateKey = async () => {
  const workspace = await createTestWorkspace()
  const privateKey = await createTestApiKey({
    data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
  })
  return { workspace, privateKey }
}

const createOrganizationWithKey = async () => {
  const organization = await createTestOrganization()
  const organizationApiKey = await createTestOrganizationApiKey({
    data: { organizationId: organization.id },
  })
  return { organization, organizationApiKey }
}

describe('/api/api-keys', () => {
  // The first test loads the route module, so it covers the whole surface:
  // organization-key creation, listing, serialization and the CORS preflight
  // answer.
  it('creates keys of any type with an organization key, lists them and answers preflight requests', async () => {
    const { organization, organizationApiKey } =
      await createOrganizationWithKey()
    const workspace = await createTestWorkspace({
      data: { organizationId: organization.id },
    })
    const appHandler = await importCollection()

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const privateResponse = await fetch({
          method: 'POST',
          headers: { Authorization: `Bearer ${organizationApiKey.value}` },
          body: JSON.stringify({
            type: ApiKeyType.PRIVATE,
            name: 'Server key',
            workspaceId: workspace.id,
          }),
        })

        assert.strictEqual(privateResponse.status, 200)
        const { apiKey: privateKey } = await privateResponse.json()

        const publicResponse = await fetch({
          method: 'POST',
          headers: { Authorization: `Bearer ${organizationApiKey.value}` },
          body: JSON.stringify({
            type: ApiKeyType.PUBLIC,
            workspaceId: workspace.id,
          }),
        })

        assert.strictEqual(publicResponse.status, 200)
        const { apiKey: publicKey } = await publicResponse.json()

        const stored = await prisma.apiKey.findMany({
          where: { workspaceId: workspace.id },
          orderBy: { createdAt: 'asc' },
        })
        assert.strictEqual(stored.length, 2)
        const [storedPrivate, storedPublic] = stored
        assert.strictEqual(storedPublic.name, '')
        assert.deepStrictEqual(privateKey, {
          id: storedPrivate.id,
          type: ApiKeyType.PRIVATE,
          name: 'Server key',
          value: storedPrivate.value,
          createdAt: storedPrivate.createdAt.toISOString(),
          updatedAt: storedPrivate.updatedAt.toISOString(),
        })
        assert.deepStrictEqual(publicKey, {
          id: storedPublic.id,
          type: ApiKeyType.PUBLIC,
          name: 'Untitled API key',
          value: storedPublic.value,
          createdAt: storedPublic.createdAt.toISOString(),
          updatedAt: storedPublic.updatedAt.toISOString(),
        })

        // The new private key lists the public keys of its workspace.
        const listResponse = await fetch({
          method: 'GET',
          headers: { Authorization: `Bearer ${privateKey.value}` },
        })
        assert.strictEqual(listResponse.status, 200)
        assert.deepStrictEqual(await listResponse.json(), {
          apiKeys: [publicKey],
        })

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

  it('rejects requests without an authorization header', async () => {
    const appHandler = await importCollection()

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const getResponse = await fetch({ method: 'GET' })
        assert.strictEqual(getResponse.status, 400)
        assert.deepStrictEqual(await getResponse.json(), {
          error: 'No authorization header found',
        })

        const postResponse = await fetch({
          method: 'POST',
          body: JSON.stringify({ name: 'Nope' }),
        })
        assert.strictEqual(postResponse.status, 400)
        assert.deepStrictEqual(await postResponse.json(), {
          error: 'No authorization header found',
        })
      },
    })
  })

  it('rejects malformed, unknown and public bearer tokens', async () => {
    const workspace = await createTestWorkspace()
    const publicKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
    })
    const appHandler = await importCollection()

    const authorizations = [
      'Bearer not-a-uuid',
      `Basic ${randomUUID()}`,
      `Bearer ${randomUUID()}`,
      `Bearer ${publicKey.value}`,
    ]

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        for (const authorization of authorizations) {
          const getResponse = await fetch({
            method: 'GET',
            headers: { Authorization: authorization },
          })
          assert.strictEqual(getResponse.status, 400)
          assert.deepStrictEqual(await getResponse.json(), {
            error: 'Invalid api key',
          })

          const postResponse = await fetch({
            method: 'POST',
            headers: { Authorization: authorization },
            body: JSON.stringify({ name: 'Nope' }),
          })
          assert.strictEqual(postResponse.status, 400)
          assert.deepStrictEqual(await postResponse.json(), {
            error: 'Invalid api key',
          })
        }
      },
    })

    assert.strictEqual(
      await prisma.apiKey.count({ where: { workspaceId: workspace.id } }),
      1,
    )
  })

  it('lists only the public keys of the private key workspace', async () => {
    const { workspace, privateKey } = await createWorkspaceWithPrivateKey()
    const namedKey = await createTestApiKey({
      data: {
        workspaceId: workspace.id,
        type: ApiKeyType.PUBLIC,
        name: 'Website widget',
      },
    })
    const unnamedKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC, name: '' },
    })
    const otherWorkspace = await createTestWorkspace()
    await createTestApiKey({
      data: { workspaceId: otherWorkspace.id, type: ApiKeyType.PUBLIC },
    })
    const appHandler = await importCollection()

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'GET',
          headers: { Authorization: `Bearer ${privateKey.value}` },
        })

        assert.strictEqual(response.status, 200)
        const { apiKeys } = await response.json()
        const byId = new Map(
          apiKeys.map((apiKey: { id: string }) => [apiKey.id, apiKey]),
        )

        assert.strictEqual(apiKeys.length, 2)
        assert.deepStrictEqual(byId.get(namedKey.id), {
          id: namedKey.id,
          type: ApiKeyType.PUBLIC,
          name: 'Website widget',
          value: namedKey.value,
          createdAt: namedKey.createdAt.toISOString(),
          updatedAt: namedKey.updatedAt.toISOString(),
        })
        assert.strictEqual(
          (byId.get(unnamedKey.id) as { name: string }).name,
          'Untitled API key',
        )
      },
    })
  })

  it('creates public keys with a private key', async () => {
    const { workspace, privateKey } = await createWorkspaceWithPrivateKey()
    const appHandler = await importCollection()

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const namedResponse = await fetch({
          method: 'POST',
          headers: { Authorization: `Bearer ${privateKey.value}` },
          body: JSON.stringify({ name: 'Docs site', type: 'PRIVATE' }),
        })

        assert.strictEqual(namedResponse.status, 200)
        const { apiKey: namedKey } = await namedResponse.json()
        assert.strictEqual(namedKey.name, 'Docs site')
        assert.strictEqual(namedKey.type, ApiKeyType.PUBLIC)

        const unnamedResponse = await fetch({
          method: 'POST',
          headers: { Authorization: `Bearer ${privateKey.value}` },
          body: JSON.stringify({}),
        })

        assert.strictEqual(unnamedResponse.status, 200)
        const { apiKey: unnamedKey } = await unnamedResponse.json()
        assert.strictEqual(unnamedKey.name, 'Untitled API key')

        const stored = await prisma.apiKey.findMany({
          where: { id: { in: [namedKey.id, unnamedKey.id] } },
        })
        assert.strictEqual(stored.length, 2)
        for (const apiKey of stored) {
          assert.strictEqual(apiKey.workspaceId, workspace.id)
          assert.strictEqual(apiKey.type, ApiKeyType.PUBLIC)
        }
      },
    })
  })

  it('rejects invalid bodies from private keys', async () => {
    const { workspace, privateKey } = await createWorkspaceWithPrivateKey()
    const appHandler = await importCollection()

    const bodies = ['not json', JSON.stringify({ name: '' })]

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        for (const body of bodies) {
          const response = await fetch({
            method: 'POST',
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body,
          })
          assert.strictEqual(response.status, 400)
          assert.deepStrictEqual(await response.json(), {
            error: 'Invalid body',
          })
        }
      },
    })

    assert.strictEqual(
      await prisma.apiKey.count({ where: { workspaceId: workspace.id } }),
      1,
    )
  })

  it('rejects invalid organization key bodies and foreign workspaces', async () => {
    const { organizationApiKey } = await createOrganizationWithKey()
    const otherOrganization = await createTestOrganization()
    const foreignWorkspace = await createTestWorkspace({
      data: { organizationId: otherOrganization.id },
    })
    const appHandler = await importCollection()

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const invalidBodies = [
          'not json',
          JSON.stringify({ workspaceId: foreignWorkspace.id }),
          JSON.stringify({ type: 'SECRET', workspaceId: foreignWorkspace.id }),
        ]

        for (const body of invalidBodies) {
          const response = await fetch({
            method: 'POST',
            headers: { Authorization: `Bearer ${organizationApiKey.value}` },
            body,
          })
          assert.strictEqual(response.status, 400)
          assert.deepStrictEqual(await response.json(), {
            error: 'Invalid body',
          })
        }

        const foreignResponse = await fetch({
          method: 'POST',
          headers: { Authorization: `Bearer ${organizationApiKey.value}` },
          body: JSON.stringify({
            type: ApiKeyType.PRIVATE,
            workspaceId: foreignWorkspace.id,
          }),
        })
        assert.strictEqual(foreignResponse.status, 400)
        assert.deepStrictEqual(await foreignResponse.json(), {
          error: 'Invalid workspace',
        })
      },
    })

    assert.strictEqual(
      await prisma.apiKey.count({
        where: { workspaceId: foreignWorkspace.id },
      }),
      0,
    )
  })
})

describe('/api/api-keys/[apiKeyId]', () => {
  const importMember = () =>
    import('../../../src/app/api/api-keys/[apiKeyId]/route')

  // The first test loads the route module, so it also checks the CORS
  // preflight answer.
  it('answers preflight requests and rejects missing authorization, invalid keys and invalid ids', async () => {
    const { workspace, privateKey } = await createWorkspaceWithPrivateKey()
    const publicKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
    })
    const appHandler = await importMember()
    const methods = ['GET', 'PATCH', 'DELETE']

    await testApiHandler({
      appHandler,
      params: { apiKeyId: publicKey.id },
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
          const noAuth = await fetch({
            method,
            body: method === 'PATCH' ? JSON.stringify({ name: 'x' }) : null,
          })
          assert.strictEqual(noAuth.status, 400)
          assert.deepStrictEqual(await noAuth.json(), {
            error: 'No authorization header found',
          })

          const invalidKey = await fetch({
            method,
            headers: { Authorization: `Bearer ${publicKey.value}` },
            body: method === 'PATCH' ? JSON.stringify({ name: 'x' }) : null,
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
      params: { apiKeyId: 'not-a-uuid' },
      test: async ({ fetch }) => {
        for (const method of methods) {
          const response = await fetch({
            method,
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body: method === 'PATCH' ? JSON.stringify({ name: 'x' }) : null,
          })
          assert.strictEqual(response.status, 400)
          assert.deepStrictEqual(await response.json(), {
            error: 'Invalid api key id',
          })
        }
      },
    })

    const stored = await prisma.apiKey.findUniqueOrThrow({
      where: { id: publicKey.id },
    })
    assert.strictEqual(stored.name, publicKey.name)
  })

  const createPublicKey = async () => {
    const { workspace, privateKey } = await createWorkspaceWithPrivateKey()
    const publicKey = await createTestApiKey({
      data: {
        workspaceId: workspace.id,
        type: ApiKeyType.PUBLIC,
        name: 'Before',
      },
    })

    return {
      publicKey,
      headers: { Authorization: `Bearer ${privateKey.value}` },
    }
  }

  it('reads a public key', async () => {
    const { publicKey, headers } = await createPublicKey()

    await testApiHandler({
      appHandler: await importMember(),
      params: { apiKeyId: publicKey.id },
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET', headers })
        assert.strictEqual(response.status, 200)
        assert.deepStrictEqual(await response.json(), {
          apiKey: {
            id: publicKey.id,
            type: ApiKeyType.PUBLIC,
            name: 'Before',
            value: publicKey.value,
            createdAt: publicKey.createdAt.toISOString(),
            updatedAt: publicKey.updatedAt.toISOString(),
          },
        })
        assert.strictEqual(
          response.headers.get('access-control-allow-origin'),
          '*',
        )
      },
    })
  })

  it('renames a public key with the name from the JSON body', async () => {
    const { publicKey, headers } = await createPublicKey()

    await testApiHandler({
      appHandler: await importMember(),
      params: { apiKeyId: publicKey.id },
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'PATCH',
          headers,
          body: JSON.stringify({ name: 'After' }),
        })

        assert.strictEqual(response.status, 200)
        const renamed = await prisma.apiKey.findUniqueOrThrow({
          where: { id: publicKey.id },
        })
        assert.strictEqual(renamed.name, 'After')
        assert.deepStrictEqual(await response.json(), {
          apiKey: {
            id: publicKey.id,
            type: ApiKeyType.PUBLIC,
            name: 'After',
            value: publicKey.value,
            createdAt: publicKey.createdAt.toISOString(),
            updatedAt: renamed.updatedAt.toISOString(),
          },
        })
        assert.strictEqual(
          response.headers.get('access-control-allow-origin'),
          '*',
        )
      },
    })
  })

  it('rejects renames without a valid JSON name', async () => {
    const { publicKey, headers } = await createPublicKey()

    await testApiHandler({
      appHandler: await importMember(),
      params: { apiKeyId: publicKey.id },
      test: async ({ fetch }) => {
        for (const body of ['not json', JSON.stringify({ name: '' })]) {
          const response = await fetch({ method: 'PATCH', headers, body })
          assert.strictEqual(response.status, 400)
          assert.deepStrictEqual(await response.json(), {
            error: 'No name found',
          })
        }
      },
    })

    const stored = await prisma.apiKey.findUniqueOrThrow({
      where: { id: publicKey.id },
    })
    assert.strictEqual(stored.name, 'Before')
  })

  it('deletes a public key', async () => {
    const { publicKey, headers } = await createPublicKey()

    await testApiHandler({
      appHandler: await importMember(),
      params: { apiKeyId: publicKey.id },
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'DELETE', headers })
        assert.strictEqual(response.status, 200)
        assert.deepStrictEqual(await response.json(), {
          apiKey: {
            id: publicKey.id,
            type: ApiKeyType.PUBLIC,
            name: 'Before',
            value: publicKey.value,
            createdAt: publicKey.createdAt.toISOString(),
            updatedAt: publicKey.updatedAt.toISOString(),
          },
        })
        assert.strictEqual(
          response.headers.get('access-control-allow-origin'),
          '*',
        )
        assert.strictEqual(
          await prisma.apiKey.findUnique({ where: { id: publicKey.id } }),
          null,
        )

        const afterDelete = await fetch({ method: 'GET', headers })
        assert.strictEqual(afterDelete.status, 400)
        assert.deepStrictEqual(await afterDelete.json(), {
          error: 'No api key found',
        })
      },
    })
  })

  it('does not expose private keys or keys of other workspaces', async () => {
    const { privateKey } = await createWorkspaceWithPrivateKey()
    const otherWorkspace = await createTestWorkspace()
    const foreignKey = await createTestApiKey({
      data: { workspaceId: otherWorkspace.id, type: ApiKeyType.PUBLIC },
    })
    const appHandler = await importMember()

    for (const apiKeyId of [foreignKey.id, privateKey.id, randomUUID()]) {
      await testApiHandler({
        appHandler,
        params: { apiKeyId },
        test: async ({ fetch }) => {
          for (const method of ['GET', 'PATCH', 'DELETE']) {
            const response = await fetch({
              method,
              headers: { Authorization: `Bearer ${privateKey.value}` },
              body:
                method === 'PATCH' ? JSON.stringify({ name: 'Hijack' }) : null,
            })
            assert.strictEqual(response.status, 400)
            assert.deepStrictEqual(await response.json(), {
              error: 'No api key found',
            })
          }
        },
      })
    }

    const storedForeign = await prisma.apiKey.findUniqueOrThrow({
      where: { id: foreignKey.id },
    })
    assert.strictEqual(storedForeign.name, foreignKey.name)
    assert.ok(await prisma.apiKey.findUnique({ where: { id: privateKey.id } }))
  })
})
