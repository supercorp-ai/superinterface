import assert from 'node:assert'
import { describe, it } from 'node:test'
import { validThreadId } from '@/lib/threads/validThreadId'

const fallbackUuid = '00000000-0000-0000-0000-000000000000'

describe('validThreadId', () => {
  it('returns the fallback uuid when there is no thread id', () => {
    assert.strictEqual(validThreadId({ threadId: null }), fallbackUuid)
    assert.strictEqual(validThreadId({ threadId: '' }), fallbackUuid)
  })

  it('returns the fallback uuid when the thread id is not a uuid', () => {
    assert.strictEqual(validThreadId({ threadId: 'thread_123' }), fallbackUuid)
  })

  it('returns a valid uuid thread id as is', () => {
    const threadId = '6f1c2b1e-9f0a-4c3d-8e2b-1a2b3c4d5e6f'

    assert.strictEqual(validThreadId({ threadId }), threadId)
  })
})
