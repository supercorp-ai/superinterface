import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

type TaskSchedule = PrismaJson.TaskSchedule

// The module is imported inside the first test, with nothing else loaded that
// registers dayjs plugins, so its own set-up (the utc, timezone and duration
// plugins and its frequency table) is what the tests rely on.
const loadGetNextOccurrence = async () =>
  (await import('../../src/lib/tasks/getNextOccurrence')).getNextOccurrence

// Monday 2030-01-07 12:00 UTC.
const NOW = new Date('2030-01-07T12:00:00.000Z')

const nextOccurrence = async ({
  schedule,
  now = NOW,
}: {
  schedule: unknown
  now?: Date
}) => {
  const getNextOccurrence = await loadGetNextOccurrence()
  return getNextOccurrence({ schedule: schedule as TaskSchedule, now })
}

const inMinutes = (minutes: number) =>
  new Date(NOW.getTime() + minutes * 60 * 1000).toISOString()

describe('getNextOccurrence', () => {
  it('finds the next occurrence of a rule in the schedule time zone and fires a continuous schedule within its duration', async () => {
    // Tuesday 2030-01-01 09:00 in New York, every day but only on Wednesdays.
    assert.equal(
      await nextOccurrence({
        schedule: {
          start: '2030-01-01T09:00:00',
          timeZone: 'America/New_York',
          recurrenceRules: [{ frequency: 'daily', byDay: ['WE'] }],
        },
      }),
      '2030-01-09T14:00:00.000Z',
    )
    // Started an hour ago and lasts two hours: fire now.
    assert.equal(
      await nextOccurrence({
        schedule: { start: inMinutes(-60), duration: 'PT2H' },
      }),
      NOW.toISOString(),
    )
  })

  describe('one-shot schedule (no recurrenceRules)', () => {
    it('returns the start when it is in the future', async () => {
      assert.equal(
        await nextOccurrence({ schedule: { start: inMinutes(60) } }),
        inMinutes(60),
      )
    })

    it('reads an offset-less start in the schedule time zone', async () => {
      // 09:00 in Vilnius (UTC+2).
      assert.equal(
        await nextOccurrence({
          schedule: {
            start: '2030-01-08T09:00:00',
            timeZone: 'Europe/Vilnius',
          },
        }),
        '2030-01-08T07:00:00.000Z',
      )
      // A start with an offset keeps its instant.
      assert.equal(
        await nextOccurrence({
          schedule: {
            start: '2030-01-08T09:00:00+05:30',
            timeZone: 'Europe/Vilnius',
          },
        }),
        '2030-01-08T03:30:00.000Z',
      )
    })

    it('returns null when the start is in the past or within the next second', async () => {
      assert.equal(
        await nextOccurrence({ schedule: { start: inMinutes(-60) } }),
        null,
      )
      assert.equal(
        await nextOccurrence({ schedule: { start: NOW.toISOString() } }),
        null,
      )
    })
  })

  describe('continuous schedule (start + duration, no recurrenceRules)', () => {
    it('returns now while inside the duration window', async () => {
      for (const [minutesAgo, duration] of [
        [1, 'PT1H'],
        [365 * 24 * 60, 'P10Y'],
        [12 * 60, 'P1D'],
      ] as const) {
        assert.equal(
          await nextOccurrence({
            schedule: { start: inMinutes(-minutesAgo), duration },
          }),
          NOW.toISOString(),
          duration,
        )
      }
      assert.equal(
        await nextOccurrence({
          schedule: {
            start: new Date(NOW.getTime() - 10 * 1000).toISOString(),
            duration: 'PT30S',
          },
        }),
        NOW.toISOString(),
      )
    })

    it('returns null once the duration window has passed', async () => {
      for (const [minutesAgo, duration] of [
        [120, 'PT1H'],
        [1, 'PT30S'],
      ] as const) {
        assert.equal(
          await nextOccurrence({
            schedule: { start: inMinutes(-minutesAgo), duration },
          }),
          null,
          duration,
        )
      }
    })

    it('returns the start when it is in the future even with a duration', async () => {
      assert.equal(
        await nextOccurrence({
          schedule: { start: inMinutes(60), duration: 'PT10H' },
        }),
        inMinutes(60),
      )
    })

    it('ignores an invalid or non-string duration', async () => {
      for (const duration of ['invalid', 12345]) {
        assert.equal(
          await nextOccurrence({
            schedule: { start: inMinutes(-1), duration },
          }),
          null,
          String(duration),
        )
      }
    })

    it('ignores the duration when recurrenceRules are present', async () => {
      assert.equal(
        await nextOccurrence({
          schedule: {
            start: inMinutes(-120),
            duration: 'P10Y',
            recurrenceRules: [{ frequency: 'daily' }],
          },
        }),
        '2030-01-08T10:00:00.000Z',
      )
    })
  })

  describe('recurring schedule', () => {
    it('steps daily and hourly rules by their interval past now', async () => {
      assert.equal(
        await nextOccurrence({
          schedule: {
            start: inMinutes(-12 * 60),
            recurrenceRules: [{ frequency: 'daily' }],
          },
        }),
        '2030-01-08T00:00:00.000Z',
      )
      assert.equal(
        await nextOccurrence({
          schedule: {
            start: inMinutes(-30),
            recurrenceRules: [{ frequency: 'hourly' }],
          },
        }),
        '2030-01-07T12:30:00.000Z',
      )
      assert.equal(
        await nextOccurrence({
          schedule: {
            start: inMinutes(-90),
            recurrenceRules: [{ frequency: 'hourly', interval: 2 }],
          },
        }),
        '2030-01-07T12:30:00.000Z',
      )
      // An occurrence exactly at now is skipped.
      assert.equal(
        await nextOccurrence({
          schedule: {
            start: inMinutes(-60),
            recurrenceRules: [{ frequency: 'hourly' }],
          },
        }),
        '2030-01-07T13:00:00.000Z',
      )
    })

    it('uses a future start as the first occurrence', async () => {
      assert.equal(
        await nextOccurrence({
          schedule: {
            start: inMinutes(90),
            recurrenceRules: [{ frequency: 'weekly' }],
          },
        }),
        inMinutes(90),
      )
    })

    it('advances to the next time matching every by-rule', async () => {
      assert.equal(
        await nextOccurrence({
          schedule: {
            start: '2030-01-01T00:00:00Z',
            recurrenceRules: [
              {
                frequency: 'minutely',
                byHour: [14],
                byMinute: [30],
                bySecond: [0],
              },
            ],
          },
        }),
        '2030-01-07T14:30:00.000Z',
      )
      assert.equal(
        await nextOccurrence({
          schedule: {
            start: '2029-12-15T08:00:00Z',
            recurrenceRules: [{ frequency: 'monthly', byMonth: [3] }],
          },
        }),
        '2030-03-15T08:00:00.000Z',
      )
    })

    it('picks the earliest occurrence across rules and skips rules that ended', async () => {
      assert.equal(
        await nextOccurrence({
          schedule: {
            start: inMinutes(-12 * 60),
            recurrenceRules: [
              { frequency: 'daily' },
              { frequency: 'hourly', interval: 5 },
              { frequency: 'fortnightly' },
              { frequency: 'minutely', until: inMinutes(-1) },
              { frequency: 'minutely', count: 10 },
            ],
          },
        }),
        '2030-01-07T15:00:00.000Z',
      )
      assert.equal(
        await nextOccurrence({
          schedule: {
            start: inMinutes(-12 * 60),
            recurrenceRules: [
              { frequency: 'minutely', until: inMinutes(5) },
              { frequency: 'hourly', count: 20 },
            ],
          },
        }),
        '2030-01-07T12:01:00.000Z',
      )
    })

    it('returns null when no rule has an occurrence left', async () => {
      assert.equal(
        await nextOccurrence({
          schedule: {
            start: inMinutes(-12 * 60),
            recurrenceRules: [
              { frequency: 'fortnightly' },
              { frequency: 'hourly', count: 3 },
            ],
          },
        }),
        null,
      )
    })
  })

  describe('edge cases', () => {
    it('returns null for schedules without a usable start', async () => {
      for (const schedule of [
        null,
        'invalid',
        {},
        { start: 5 },
        { start: 'not-a-date' },
      ]) {
        assert.equal(await nextOccurrence({ schedule }), null, String(schedule))
      }
    })

    it('uses the current time when no time is given', async () => {
      const getNextOccurrence = await loadGetNextOccurrence()
      const past = new Date(Date.now() - 60 * 1000).toISOString()
      const before = Date.now()

      const result = getNextOccurrence({
        schedule: { start: past, duration: 'PT1H' },
      })

      const resultTime = new Date(result!).getTime()
      assert.ok(resultTime >= before && resultTime <= Date.now())
    })
  })
})
