import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { dayjs } from '../../../src/lib/tasks/occurrences/dayjsWithTimeZone'
import { getRuleNextOccurrence } from '../../../src/lib/tasks/occurrences/getRuleNextOccurrence'

// Base Monday 2030-01-07 00:00 UTC, cursor 12:00 the same day.
const base = dayjs.tz('2030-01-07T00:00:00Z', 'UTC')
const cursor = dayjs.tz('2030-01-07T12:00:00Z', 'UTC')

const nextFor = (rule: Record<string, unknown>) =>
  getRuleNextOccurrence({
    rule: rule as Parameters<typeof getRuleNextOccurrence>[0]['rule'],
    base,
    cursor,
    timeZone: 'UTC',
  })

describe('getRuleNextOccurrence', () => {
  it('returns the first step on or after the cursor', () => {
    assert.equal(
      nextFor({ frequency: 'hourly' })?.toISOString(),
      '2030-01-07T12:00:00.000Z',
    )
  })

  it('returns null, not undefined, for an unsupported frequency or a rule that has ended', () => {
    for (const rule of [
      { frequency: 'fortnightly' },
      { frequency: 'hourly', until: '2030-01-07T11:00:00Z' },
      { frequency: 'hourly', count: 3 },
    ]) {
      assert.strictEqual(nextFor(rule), null, JSON.stringify(rule))
    }
  })
})
