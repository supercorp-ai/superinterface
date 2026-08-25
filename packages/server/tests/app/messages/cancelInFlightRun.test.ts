/**
 * Hermetic unit tests for the cancel-on-disconnect helper used by the
 * `/messages` POST route.
 *
 * Pins:
 *   - the storage-provider gate (we cancel for Assistants AND Responses,
 *     skip for everything else)
 *   - the no-op cases (already-completed, no run yet)
 *   - the error path (we never throw — cancel races completion naturally
 *     and we swallow upstream 4xx)
 */
import { describe, test } from 'node:test'
import { strict as assert } from 'node:assert'
import { StorageProviderType } from '@prisma/client'
import { cancelInFlightRun } from '../../../src/app/api/messages/lib/cancelInFlightRun'

const buildClient = (
  handler: (id: string, params: unknown) => Promise<unknown>,
) =>
  ({
    beta: {
      threads: {
        runs: {
          cancel: (id: string, params: unknown) => handler(id, params),
        },
      },
    },
  }) as any

const inProgressRun = { id: 'run_abc', thread_id: 'thread_xyz' }

describe('cancelInFlightRun', () => {
  test('no-op when the run has already completed', async () => {
    let calls = 0
    const result = await cancelInFlightRun({
      assistantClient: buildClient(async () => {
        calls += 1
        return {}
      }),
      storageProviderType: StorageProviderType.OPENAI_RESPONSES,
      inProgressRun,
      hasCompleted: true,
    })
    assert.deepEqual(result, { status: 'no-op', reason: 'already-completed' })
    assert.equal(calls, 0)
  })

  test('no-op when no run was reported in_progress', async () => {
    let calls = 0
    const result = await cancelInFlightRun({
      assistantClient: buildClient(async () => {
        calls += 1
        return {}
      }),
      storageProviderType: StorageProviderType.OPENAI_RESPONSES,
      inProgressRun: null,
      hasCompleted: false,
    })
    assert.deepEqual(result, { status: 'no-op', reason: 'no-run' })
    assert.equal(calls, 0)
  })

  test('every enum value the test pins below covers a known provider', () => {
    // Meta: keep the test list in sync with the enum. If a new provider is
    // added we want this assertion to fail loudly so we re-evaluate the
    // cancel policy.
    const known = new Set([
      StorageProviderType.OPENAI,
      StorageProviderType.AZURE_OPENAI,
      StorageProviderType.OPENAI_RESPONSES,
      StorageProviderType.AZURE_RESPONSES,
      StorageProviderType.SUPERINTERFACE_CLOUD,
      StorageProviderType.AZURE_AGENTS,
    ])
    for (const v of Object.values(StorageProviderType)) {
      assert.ok(known.has(v), `unknown StorageProviderType in enum: ${v}`)
    }
  })

  test('cancels for the OPENAI (Assistants) storage provider', async () => {
    let received: { id: string; params: any } | null = null
    const result = await cancelInFlightRun({
      assistantClient: buildClient(async (id, params) => {
        received = { id, params }
        return {}
      }),
      storageProviderType: StorageProviderType.OPENAI,
      inProgressRun,
      hasCompleted: false,
    })
    assert.deepEqual(result, { status: 'cancelled' })
    assert.deepEqual(received, {
      id: 'run_abc',
      params: { thread_id: 'thread_xyz' },
    })
  })

  test('cancels for AZURE_OPENAI (Assistants) storage provider', async () => {
    let received: { id: string; params: any } | null = null
    const result = await cancelInFlightRun({
      assistantClient: buildClient(async (id, params) => {
        received = { id, params }
        return {}
      }),
      storageProviderType: StorageProviderType.AZURE_OPENAI,
      inProgressRun,
      hasCompleted: false,
    })
    assert.deepEqual(result, { status: 'cancelled' })
    assert.deepEqual(received, {
      id: 'run_abc',
      params: { thread_id: 'thread_xyz' },
    })
  })

  test('skips SUPERINTERFACE_CLOUD storage provider (not Assistants/Responses-shaped)', async () => {
    let calls = 0
    const result = await cancelInFlightRun({
      assistantClient: buildClient(async () => {
        calls += 1
        return {}
      }),
      storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
      inProgressRun,
      hasCompleted: false,
    })
    assert.equal(result.status, 'no-op')
    assert.equal(calls, 0)
  })

  test('skips AZURE_AGENTS storage provider', async () => {
    let calls = 0
    const result = await cancelInFlightRun({
      assistantClient: buildClient(async () => {
        calls += 1
        return {}
      }),
      storageProviderType: StorageProviderType.AZURE_AGENTS,
      inProgressRun,
      hasCompleted: false,
    })
    assert.equal(result.status, 'no-op')
    assert.equal(calls, 0)
  })

  test('cancels for the OPENAI_RESPONSES storage provider', async () => {
    let received: { id: string; params: any } | null = null
    const result = await cancelInFlightRun({
      assistantClient: buildClient(async (id, params) => {
        received = { id, params }
        return {}
      }),
      storageProviderType: StorageProviderType.OPENAI_RESPONSES,
      inProgressRun,
      hasCompleted: false,
    })
    assert.deepEqual(result, { status: 'cancelled' })
    assert.deepEqual(received, {
      id: 'run_abc',
      params: { thread_id: 'thread_xyz' },
    })
  })

  test('cancels for AZURE_RESPONSES (also Responses-shaped)', async () => {
    if (!(StorageProviderType as Record<string, string>).AZURE_RESPONSES) {
      // Schema variant without Azure Responses — skip rather than fabricate.
      return
    }
    let received: { id: string; params: any } | null = null
    const result = await cancelInFlightRun({
      assistantClient: buildClient(async (id, params) => {
        received = { id, params }
        return {}
      }),
      storageProviderType: StorageProviderType.AZURE_RESPONSES,
      inProgressRun,
      hasCompleted: false,
    })
    assert.deepEqual(result, { status: 'cancelled' })
    assert.deepEqual(received, {
      id: 'run_abc',
      params: { thread_id: 'thread_xyz' },
    })
  })

  test('does not throw when upstream cancel fails (race vs natural completion)', async () => {
    const warnings: { msg: string; err?: unknown }[] = []
    const result = await cancelInFlightRun({
      assistantClient: buildClient(async () => {
        const err = new Error(
          '400 Cannot cancel run with status `completed`',
        ) as Error & { status: number }
        err.status = 400
        throw err
      }),
      storageProviderType: StorageProviderType.OPENAI_RESPONSES,
      inProgressRun,
      hasCompleted: false,
      onWarn: (msg, err) => warnings.push({ msg, err }),
    })
    assert.equal(result.status, 'error')
    assert.equal(warnings.length, 1)
    assert.match(warnings[0].msg, /cancel-on-disconnect/)
  })

  test('cancel error path swallows the throw — caller never sees it', async () => {
    let captured: unknown = null
    try {
      await cancelInFlightRun({
        assistantClient: buildClient(async () => {
          throw new Error('upstream blew up')
        }),
        storageProviderType: StorageProviderType.OPENAI_RESPONSES,
        inProgressRun,
        hasCompleted: false,
      })
    } catch (e) {
      captured = e
    }
    assert.equal(captured, null, 'helper must not propagate cancel errors')
  })
})
