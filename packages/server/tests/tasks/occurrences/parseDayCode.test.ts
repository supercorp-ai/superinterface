import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseDayCode } from '../../../src/lib/tasks/occurrences/parseDayCode'

describe('parseDayCode', () => {
  it('reads the weekday index from the last two letters of a day code', () => {
    assert.equal(parseDayCode({ value: 'SU' }), 0)
    assert.equal(parseDayCode({ value: '1mo' }), 1)
    assert.equal(parseDayCode({ value: '-1SA' }), 6)
  })

  it('returns null, not undefined, for an unknown day code', () => {
    for (const value of ['XX', '', 'constructor']) {
      assert.strictEqual(parseDayCode({ value }), null, value)
    }
  })
})
