import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { describe, it } from 'node:test'
import { ApiKeyType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getApiKey } from '@/lib/apiKeys/getApiKey'
import { createTestWorkspace } from '../workspaces/createTestWorkspace'
import { createTestApiKey } from './createTestApiKey'

describe('getApiKey', () => {
  it('returns null without an authorization header', async () => {
    const apiKey = await getApiKey({
      authorization: null,
      type: ApiKeyType.PRIVATE,
      prisma,
    })

    assert.strictEqual(apiKey, null)
  })

  it('returns null when the bearer value is not a uuid', async () => {
    for (const authorization of ['Bearer not-a-uuid', randomUUID()]) {
      const apiKey = await getApiKey({
        authorization,
        type: ApiKeyType.PRIVATE,
        prisma,
      })

      assert.strictEqual(apiKey, null, authorization)
    }
  })

  it('returns the key of the requested type for its bearer value', async () => {
    const workspace = await createTestWorkspace()
    const privateKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
    })

    assert.deepStrictEqual(
      await getApiKey({
        authorization: `Bearer ${privateKey.value}`,
        type: ApiKeyType.PRIVATE,
        prisma,
      }),
      privateKey,
    )
    assert.strictEqual(
      await getApiKey({
        authorization: `Bearer ${privateKey.value}`,
        type: ApiKeyType.PUBLIC,
        prisma,
      }),
      null,
    )
  })
})
