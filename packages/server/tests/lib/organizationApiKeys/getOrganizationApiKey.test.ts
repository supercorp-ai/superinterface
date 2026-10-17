import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { describe, it } from 'node:test'
import { prisma } from '@/lib/prisma'
import { getOrganizationApiKey } from '@/lib/organizationApiKeys/getOrganizationApiKey'
import { createTestOrganization } from '../organizations/createTestOrganization'
import { createTestOrganizationApiKey } from './createTestOrganizationApiKey'

describe('getOrganizationApiKey', () => {
  it('returns null when the bearer value is not a uuid', async () => {
    for (const authorization of ['Bearer not-a-uuid', randomUUID()]) {
      const organizationApiKey = await getOrganizationApiKey({
        authorization,
        prisma,
      })

      assert.strictEqual(organizationApiKey, null, authorization)
    }
  })

  it('returns the organization key for its bearer value', async () => {
    const organization = await createTestOrganization()
    const organizationApiKey = await createTestOrganizationApiKey({
      data: { organizationId: organization.id },
    })

    assert.deepStrictEqual(
      await getOrganizationApiKey({
        authorization: `Bearer ${organizationApiKey.value}`,
        prisma,
      }),
      organizationApiKey,
    )
    assert.strictEqual(
      await getOrganizationApiKey({
        authorization: `Bearer ${randomUUID()}`,
        prisma,
      }),
      null,
    )
  })
})
