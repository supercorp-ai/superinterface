import { testApiHandler } from 'next-test-api-route-handler'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { describe, it } from 'node:test'
import { ApiKeyType, type PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildPOST } from '../../../src/app/api/workspaces/buildRoute'
import { createTestWorkspace } from '../../lib/workspaces/createTestWorkspace'
import { createTestApiKey } from '../../lib/apiKeys/createTestApiKey'
import { createTestOrganization } from '../../lib/organizations/createTestOrganization'
import { createTestOrganizationApiKey } from '../../lib/organizationApiKeys/createTestOrganizationApiKey'
import { corsHeadersOf } from '../../lib/http/corsHeadersOf'

const importCollection = () => import('../../../src/app/api/workspaces/route')

const importMember = () =>
  import('../../../src/app/api/workspaces/[workspaceId]/route')

const createOrganizationWithKey = async () => {
  const organization = await createTestOrganization()
  const organizationApiKey = await createTestOrganizationApiKey({
    data: { organizationId: organization.id },
  })
  return { organization, organizationApiKey }
}

// A private workspace key is not an organization key, so it must be rejected.
const createWorkspacePrivateKey = async () => {
  const workspace = await createTestWorkspace()
  return createTestApiKey({
    data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
  })
}

describe('/api/workspaces', () => {
  // The first test loads the route module, so it also checks the CORS
  // preflight answer.
  it('answers preflight requests and rejects missing and invalid organization keys', async () => {
    const privateKey = await createWorkspacePrivateKey()
    const appHandler = await importCollection()

    await testApiHandler({
      appHandler,
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

        for (const method of ['GET', 'POST']) {
          const body = method === 'POST' ? JSON.stringify({ name: 'x' }) : null

          const noAuth = await fetch({ method, body })
          assert.strictEqual(noAuth.status, 400)
          assert.deepStrictEqual(await noAuth.json(), {
            error: 'No authorization header found',
          })

          for (const authorization of [
            'Bearer not-a-uuid',
            `Bearer ${randomUUID()}`,
            `Bearer ${privateKey.value}`,
          ]) {
            const response = await fetch({
              method,
              headers: { Authorization: authorization },
              body,
            })
            assert.strictEqual(response.status, 400)
            assert.deepStrictEqual(await response.json(), {
              error: 'Invalid organization api key',
            })
          }
        }
      },
    })
  })

  it('lists only the workspaces of the key organization', async () => {
    const { organization, organizationApiKey } =
      await createOrganizationWithKey()
    const first = await createTestWorkspace({
      data: { name: 'First', organizationId: organization.id },
    })
    const second = await createTestWorkspace({
      data: { name: 'Second', organizationId: organization.id },
    })
    const otherOrganization = await createTestOrganization()
    await createTestWorkspace({
      data: { name: 'Foreign', organizationId: otherOrganization.id },
    })
    await createTestWorkspace({ data: { name: 'Orphan' } })
    const appHandler = await importCollection()

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'GET',
          headers: { Authorization: `Bearer ${organizationApiKey.value}` },
        })

        assert.strictEqual(response.status, 200)
        const { workspaces } = await response.json()
        const sorted = [...workspaces].sort((a, b) =>
          a.name.localeCompare(b.name),
        )
        assert.deepStrictEqual(sorted, [
          {
            id: first.id,
            name: 'First',
            createdAt: first.createdAt.toISOString(),
            updatedAt: first.updatedAt.toISOString(),
          },
          {
            id: second.id,
            name: 'Second',
            createdAt: second.createdAt.toISOString(),
            updatedAt: second.updatedAt.toISOString(),
          },
        ])
      },
    })
  })

  it('creates named and unnamed workspaces in the key organization', async () => {
    const { organization, organizationApiKey } =
      await createOrganizationWithKey()
    const appHandler = await importCollection()

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const headers = { Authorization: `Bearer ${organizationApiKey.value}` }

        const namedResponse = await fetch({
          method: 'POST',
          headers,
          body: JSON.stringify({ name: 'Support bots' }),
        })
        assert.strictEqual(namedResponse.status, 200)
        const { workspace: named } = await namedResponse.json()
        assert.strictEqual(named.name, 'Support bots')

        const unnamedResponse = await fetch({
          method: 'POST',
          headers,
          body: JSON.stringify({}),
        })
        assert.strictEqual(unnamedResponse.status, 200)
        const { workspace: unnamed } = await unnamedResponse.json()
        assert.strictEqual(unnamed.name, '')

        const stored = await prisma.workspace.findMany({
          where: { id: { in: [named.id, unnamed.id] } },
        })
        assert.strictEqual(stored.length, 2)
        for (const workspace of stored) {
          assert.strictEqual(workspace.organizationId, organization.id)
        }
      },
    })
  })

  it('rejects invalid workspace payloads', async () => {
    const { organization, organizationApiKey } =
      await createOrganizationWithKey()
    const appHandler = await importCollection()

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: { Authorization: `Bearer ${organizationApiKey.value}` },
          body: JSON.stringify({ name: 42 }),
        })
        assert.strictEqual(response.status, 400)
        assert.deepStrictEqual(await response.json(), {
          error: 'Invalid payload',
        })
      },
    })

    assert.strictEqual(
      await prisma.workspace.count({
        where: { organizationId: organization.id },
      }),
      0,
    )
  })
})

describe('/api/workspaces/[workspaceId]', () => {
  // The first test loads the route module, so it also checks the CORS
  // preflight answer.
  it('answers preflight requests and rejects missing and invalid organization keys and invalid ids', async () => {
    const { organization, organizationApiKey } =
      await createOrganizationWithKey()
    const workspace = await createTestWorkspace({
      data: { name: 'Untouched', organizationId: organization.id },
    })
    const privateKey = await createWorkspacePrivateKey()
    const appHandler = await importMember()

    // The route serves GET, PATCH and OPTIONS through its builders.
    assert.deepStrictEqual(
      ['GET', 'PATCH', 'OPTIONS'].map(
        (method) => typeof appHandler[method as keyof typeof appHandler],
      ),
      ['function', 'function', 'function'],
    )

    await testApiHandler({
      appHandler,
      params: { workspaceId: workspace.id },
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

        for (const method of ['GET', 'PATCH']) {
          const body =
            method === 'PATCH' ? JSON.stringify({ name: 'Changed' }) : null

          const noAuth = await fetch({ method, body })
          assert.strictEqual(noAuth.status, 400)
          assert.deepStrictEqual(await noAuth.json(), {
            error: 'No authorization header found',
          })

          const invalidKey = await fetch({
            method,
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body,
          })
          assert.strictEqual(invalidKey.status, 400)
          assert.deepStrictEqual(await invalidKey.json(), {
            error: 'Invalid organization api key',
          })
        }
      },
    })

    await testApiHandler({
      appHandler,
      params: { workspaceId: 'not-a-uuid' },
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'GET',
          headers: { Authorization: `Bearer ${organizationApiKey.value}` },
        })
        assert.strictEqual(response.status, 400)
        assert.deepStrictEqual(await response.json(), {
          error: 'Invalid workspace id',
        })
      },
    })

    const stored = await prisma.workspace.findUniqueOrThrow({
      where: { id: workspace.id },
    })
    assert.strictEqual(stored.name, 'Untouched')
  })

  // Without the id validation, 'not-a-uuid' would reach the uuid column
  // lookup and fail with a 500 instead.
  it('rejects an invalid workspace id with a validation error before looking it up', async () => {
    const { organizationApiKey } = await createOrganizationWithKey()
    const appHandler = await importMember()

    await testApiHandler({
      appHandler,
      params: { workspaceId: 'not-a-uuid' },
      test: async ({ fetch }) => {
        for (const method of ['GET', 'PATCH']) {
          const response = await fetch({
            method,
            headers: { Authorization: `Bearer ${organizationApiKey.value}` },
            body: method === 'PATCH' ? JSON.stringify({ name: 'x' }) : null,
          })
          assert.strictEqual(response.status, 400)
          assert.deepStrictEqual(await response.json(), {
            error: 'Invalid workspace id',
          })
        }
      },
    })
  })

  it('reads and renames a workspace', async () => {
    const { organization, organizationApiKey } =
      await createOrganizationWithKey()
    const workspace = await createTestWorkspace({
      data: { name: 'Before', organizationId: organization.id },
    })
    const appHandler = await importMember()

    await testApiHandler({
      appHandler,
      params: { workspaceId: workspace.id },
      test: async ({ fetch }) => {
        const headers = { Authorization: `Bearer ${organizationApiKey.value}` }

        const getResponse = await fetch({ method: 'GET', headers })
        assert.strictEqual(getResponse.status, 200)
        assert.deepStrictEqual(await getResponse.json(), {
          workspace: {
            id: workspace.id,
            name: 'Before',
            createdAt: workspace.createdAt.toISOString(),
            updatedAt: workspace.updatedAt.toISOString(),
          },
        })

        const invalidPatch = await fetch({
          method: 'PATCH',
          headers,
          body: JSON.stringify({ name: 7 }),
        })
        assert.strictEqual(invalidPatch.status, 400)
        assert.deepStrictEqual(await invalidPatch.json(), {
          error: 'Invalid payload',
        })

        // An empty payload keeps the name.
        const emptyPatch = await fetch({
          method: 'PATCH',
          headers,
          body: JSON.stringify({}),
        })
        assert.strictEqual(emptyPatch.status, 200)
        const unchanged = await prisma.workspace.findUniqueOrThrow({
          where: { id: workspace.id },
        })
        assert.strictEqual(unchanged.name, 'Before')
        assert.deepStrictEqual(await emptyPatch.json(), {
          workspace: {
            id: workspace.id,
            name: 'Before',
            createdAt: workspace.createdAt.toISOString(),
            updatedAt: unchanged.updatedAt.toISOString(),
          },
        })
        assert.strictEqual(
          emptyPatch.headers.get('access-control-allow-origin'),
          '*',
        )

        const renamePatch = await fetch({
          method: 'PATCH',
          headers,
          body: JSON.stringify({ name: 'After' }),
        })
        assert.strictEqual(renamePatch.status, 200)
        const renamed = await prisma.workspace.findUniqueOrThrow({
          where: { id: workspace.id },
        })
        assert.deepStrictEqual(await renamePatch.json(), {
          workspace: {
            id: workspace.id,
            name: 'After',
            createdAt: workspace.createdAt.toISOString(),
            updatedAt: renamed.updatedAt.toISOString(),
          },
        })
        assert.strictEqual(
          renamePatch.headers.get('access-control-allow-origin'),
          '*',
        )
      },
    })

    const stored = await prisma.workspace.findUniqueOrThrow({
      where: { id: workspace.id },
    })
    assert.strictEqual(stored.name, 'After')
    assert.strictEqual(stored.organizationId, organization.id)
  })

  it('does not expose workspaces of other organizations', async () => {
    const { organizationApiKey } = await createOrganizationWithKey()
    const otherOrganization = await createTestOrganization()
    const foreign = await createTestWorkspace({
      data: { name: 'Foreign', organizationId: otherOrganization.id },
    })
    const appHandler = await importMember()

    for (const workspaceId of [foreign.id, randomUUID()]) {
      await testApiHandler({
        appHandler,
        params: { workspaceId },
        test: async ({ fetch }) => {
          for (const method of ['GET', 'PATCH']) {
            const response = await fetch({
              method,
              headers: { Authorization: `Bearer ${organizationApiKey.value}` },
              body:
                method === 'PATCH' ? JSON.stringify({ name: 'Hijack' }) : null,
            })
            assert.strictEqual(response.status, 400)
            assert.deepStrictEqual(await response.json(), {
              error: 'No workspace found',
            })
          }
        },
      })
    }

    const stored = await prisma.workspace.findUniqueOrThrow({
      where: { id: foreign.id },
    })
    assert.strictEqual(stored.name, 'Foreign')
  })
})

describe('/api/workspaces buildPOST options', () => {
  it('creates workspaces through an injected createWorkspace', async () => {
    const { organization, organizationApiKey } =
      await createOrganizationWithKey()
    const calls: { name?: string; organizationId: string }[] = []

    const POST = buildPOST({
      prisma,
      createWorkspace: ({ parsedData, organization, prisma }) => {
        calls.push({
          name: parsedData.name,
          organizationId: organization.id,
        })

        return prisma.workspace.create({
          data: {
            name: `Custom ${parsedData.name}`,
            organizationId: organization.id,
          },
        })
      },
    })

    await testApiHandler({
      appHandler: { POST },
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: { Authorization: `Bearer ${organizationApiKey.value}` },
          body: JSON.stringify({ name: 'Team' }),
        })
        assert.strictEqual(response.status, 200)
        const { workspace } = await response.json()
        assert.strictEqual(workspace.name, 'Custom Team')

        const stored = await prisma.workspace.findUniqueOrThrow({
          where: { id: workspace.id },
        })
        assert.strictEqual(stored.organizationId, organization.id)
      },
    })

    assert.deepStrictEqual(calls, [
      { name: 'Team', organizationId: organization.id },
    ])
  })

  it('returns 404 when the organization is deleted mid-request', async () => {
    const { organization, organizationApiKey } =
      await createOrganizationWithKey()

    // Simulate a concurrent deletion landing between the key lookup and the
    // organization lookup.
    const racingPrisma = prisma.$extends({
      query: {
        organization: {
          findUnique: async ({ args, query }) => {
            await prisma.organization.delete({
              where: { id: organization.id },
            })
            return query(args)
          },
        },
      },
    }) as unknown as PrismaClient

    await testApiHandler({
      appHandler: { POST: buildPOST({ prisma: racingPrisma }) },
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: { Authorization: `Bearer ${organizationApiKey.value}` },
          body: JSON.stringify({ name: 'Orphan' }),
        })
        assert.strictEqual(response.status, 404)
        assert.deepStrictEqual(await response.json(), {
          error: 'Organization not found',
        })
      },
    })

    const orphan = await prisma.workspace.findFirst({
      where: { name: 'Orphan', organizationId: organization.id },
    })
    assert.strictEqual(orphan, null)
  })
})
