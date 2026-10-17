import assert from 'node:assert'
import { describe, it } from 'node:test'
import { serializeError } from '@/lib/errors/serializeError'

describe('serializeError', () => {
  it('returns non-Error values as their string form', () => {
    assert.strictEqual(serializeError({ error: 'plain text' }), 'plain text')
    assert.strictEqual(serializeError({ error: 42 }), '42')
    assert.strictEqual(serializeError({ error: undefined }), 'undefined')
  })

  it('returns the message of an Error without a cause', () => {
    assert.strictEqual(
      serializeError({ error: new Error('Run rejected') }),
      'Run rejected',
    )
  })

  it('appends the message of an Error cause', () => {
    assert.strictEqual(
      serializeError({
        error: new Error('Connection error.', {
          cause: new Error('socket hang up'),
        }),
      }),
      'Connection error. socket hang up',
    )
  })

  it('appends a non-Error cause as text', () => {
    assert.strictEqual(
      serializeError({
        error: new Error('Lookup failed:', { cause: 'pool exhausted' }),
      }),
      'Lookup failed: pool exhausted',
    )
  })
})
