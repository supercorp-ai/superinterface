import assert from 'node:assert/strict'
import { after, describe, it, mock } from 'node:test'

// getScheduleOccurrences expands a task schedule into the concrete UTC times
// that conflict detection compares. The module is imported inside the first
// test, with nothing else loaded that registers dayjs plugins, so its own
// set-up (the utc/timezone plugins and its constants) is what the tests rely
// on.

// Monday 2030-01-07 12:00 UTC.
const NOW = new Date('2030-01-07T12:00:00.000Z')

process.env.TZ = 'UTC'
mock.timers.enable({ apis: ['Date'], now: NOW })

after(() => {
  mock.timers.reset()
})

const loadGetScheduleOccurrences = async () =>
  (await import('../../src/lib/tasks/getScheduleOccurrences'))
    .getScheduleOccurrences

type Schedule = PrismaJson.TaskSchedule

const occurrences = async ({
  schedule,
  lookAheadDays = 30,
  maxOccurrences = 120,
}: {
  schedule: unknown
  lookAheadDays?: number
  maxOccurrences?: number
}) => {
  const getScheduleOccurrences = await loadGetScheduleOccurrences()

  return getScheduleOccurrences({
    schedule: schedule as Schedule,
    lookAheadDays,
    maxOccurrences,
  }).map((occurrence) => occurrence.toISOString())
}

const inMinutes = (minutes: number) =>
  new Date(NOW.getTime() + minutes * 60 * 1000).toISOString()

describe('getScheduleOccurrences', () => {
  it('expands weekly and daily schedule occurrences in the schedule time zone, keeping the last 15 minutes', async () => {
    // Sunday 2030-01-06 00:00 in New York (UTC-5). Now is Monday 07:00 there.
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2030-01-06T05:00:00Z',
          timeZone: 'America/New_York',
          recurrenceRules: [
            {
              frequency: 'weekly',
              // Ordinal codes are read from their last two letters.
              byDay: ['1MO', 'we'],
              byHour: [9, 6, 9],
              byMinute: [50, 40],
            },
          ],
        },
        lookAheadDays: 7,
      }),
      [
        // Monday 06:40 is 20 minutes ago and dropped; 06:50 is 10 minutes ago.
        '2030-01-07T11:50:00.000Z',
        '2030-01-07T14:40:00.000Z',
        '2030-01-07T14:50:00.000Z',
        '2030-01-09T11:40:00.000Z',
        '2030-01-09T11:50:00.000Z',
        '2030-01-09T14:40:00.000Z',
        '2030-01-09T14:50:00.000Z',
        // Next Monday until exactly seven days from now.
        '2030-01-14T11:40:00.000Z',
        '2030-01-14T11:50:00.000Z',
      ],
    )

    // 21:30 on Monday in Tokyo (UTC+9): Monday's 08:30 is before the start.
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2030-01-07T12:30:00Z',
          timeZone: 'Asia/Tokyo',
          recurrenceRules: [{ frequency: 'daily', count: 3, byHour: [8] }],
        },
      }),
      [
        '2030-01-07T23:30:00.000Z',
        '2030-01-08T23:30:00.000Z',
        '2030-01-09T23:30:00.000Z',
      ],
    )
  })

  it('keeps a one-off schedule start only inside the lookback and lookahead window', async () => {
    assert.deepEqual(
      await occurrences({ schedule: { start: inMinutes(-10) } }),
      [inMinutes(-10)],
    )
    assert.deepEqual(
      await occurrences({ schedule: { start: inMinutes(-20) } }),
      [],
    )
    assert.deepEqual(
      await occurrences({
        schedule: { start: inMinutes(7 * 24 * 60 - 1) },
        lookAheadDays: 7,
      }),
      [inMinutes(7 * 24 * 60 - 1)],
    )
    assert.deepEqual(
      await occurrences({
        schedule: { start: inMinutes(7 * 24 * 60 + 1) },
        lookAheadDays: 7,
      }),
      [],
    )
    // An empty or non-array rule list is a one-off at the start.
    assert.deepEqual(
      await occurrences({
        schedule: { start: inMinutes(60), recurrenceRules: [] },
      }),
      [inMinutes(60)],
    )
    assert.deepEqual(
      await occurrences({
        schedule: { start: inMinutes(60), recurrenceRules: 'daily' },
      }),
      [inMinutes(60)],
    )
  })

  it('returns no schedule occurrences without a usable start or rule', async () => {
    for (const schedule of [
      null,
      undefined,
      'tomorrow',
      { recurrenceRules: [{ frequency: 'daily' }] },
      { start: 5 },
      { start: 'not a date' },
      {
        start: inMinutes(60),
        recurrenceRules: [null, 'daily', { interval: 1 }],
      },
      // Unsupported frequencies produce nothing.
      { start: inMinutes(60), recurrenceRules: [{ frequency: 'fortnightly' }] },
      { start: inMinutes(60), recurrenceRules: [{ frequency: 'secondly' }] },
    ]) {
      assert.deepEqual(await occurrences({ schedule }), [], String(schedule))
    }
  })

  it('steps weekly schedule occurrences by interval, count, until and byMonth', async () => {
    // Every other Monday. The start day itself is compared at midnight, so a
    // Monday 13:00 start skips that first Monday.
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2029-12-31T13:00:00Z',
          recurrenceRules: [
            { frequency: 'WEEKLY', interval: 2, byDay: ['MO'] },
          ],
        },
      }),
      ['2030-01-14T13:00:00.000Z', '2030-01-28T13:00:00.000Z'],
    )
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2030-01-08T00:00:00Z',
          recurrenceRules: [{ frequency: 'weekly', count: 2, byHour: [13] }],
        },
      }),
      ['2030-01-08T13:00:00.000Z', '2030-01-15T13:00:00.000Z'],
    )
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2030-01-08T00:00:00Z',
          recurrenceRules: [{ frequency: 'weekly', count: 0 }],
        },
      }),
      [],
    )
    // until between two days, then until within a day.
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2030-01-08T00:00:00Z',
          recurrenceRules: [
            {
              frequency: 'weekly',
              byHour: [13],
              until: '2030-01-16T00:00:00Z',
            },
          ],
        },
      }),
      ['2030-01-08T13:00:00.000Z', '2030-01-15T13:00:00.000Z'],
    )
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2030-01-08T00:00:00Z',
          recurrenceRules: [
            {
              frequency: 'weekly',
              byHour: [13],
              until: '2030-01-15T10:00:00Z',
            },
          ],
        },
      }),
      ['2030-01-08T13:00:00.000Z'],
    )
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2030-01-07T00:00:00Z',
          recurrenceRules: [
            { frequency: 'weekly', byDay: ['MO'], byMonth: [2], byHour: [13] },
          ],
        },
        lookAheadDays: 35,
      }),
      ['2030-02-04T13:00:00.000Z'],
    )
  })

  it('repeats weekly schedule occurrences on the start weekday without a usable byDay', async () => {
    for (const byDay of [undefined, [], ['XX']]) {
      assert.deepEqual(
        await occurrences({
          schedule: {
            // Tuesday.
            start: '2030-01-08T00:00:00Z',
            recurrenceRules: [
              { frequency: 'weekly', byDay, byMonth: [], byHour: [13] },
            ],
          },
          lookAheadDays: 14,
        }),
        ['2030-01-08T13:00:00.000Z', '2030-01-15T13:00:00.000Z'],
        String(byDay),
      )
    }
  })

  it('drops schedule occurrences that roll back to before the start', async () => {
    // byHour -1 on a Monday means Sunday 23:00.
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2030-01-14T00:00:00Z',
          recurrenceRules: [{ frequency: 'weekly', byHour: [-1] }],
        },
        lookAheadDays: 14,
      }),
      ['2030-01-20T23:00:00.000Z'],
    )
  })

  it('filters daily schedule occurrences by weekday, month and until', async () => {
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2030-01-07T13:00:00Z',
          recurrenceRules: [
            { frequency: 'daily', byDay: ['SA', 'SU'], byHour: [] },
          ],
        },
        lookAheadDays: 10,
      }),
      ['2030-01-12T13:00:00.000Z', '2030-01-13T13:00:00.000Z'],
    )
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2030-01-07T13:00:00Z',
          recurrenceRules: [{ frequency: 'daily', byMonth: [3] }],
        },
        lookAheadDays: 55,
      }),
      ['2030-03-01T13:00:00.000Z', '2030-03-02T13:00:00.000Z'],
    )
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2030-01-07T13:00:00Z',
          recurrenceRules: [{ frequency: 'daily', byDay: [], byMonth: [] }],
        },
        lookAheadDays: 2,
      }),
      ['2030-01-07T13:00:00.000Z', '2030-01-08T13:00:00.000Z'],
    )
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2030-01-08T13:00:00Z',
          recurrenceRules: [
            { frequency: 'daily', until: '2030-01-10T00:00:00Z' },
          ],
        },
      }),
      ['2030-01-08T13:00:00.000Z', '2030-01-09T13:00:00.000Z'],
    )
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2030-01-08T13:00:00Z',
          recurrenceRules: [
            {
              frequency: 'daily',
              byHour: [9, 15],
              until: '2030-01-09T14:00:00Z',
            },
          ],
        },
      }),
      ['2030-01-08T15:00:00.000Z', '2030-01-09T09:00:00.000Z'],
    )
  })

  it('repeats monthly and yearly schedule occurrences on the start date', async () => {
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2029-11-15T13:00:00Z',
          recurrenceRules: [{ frequency: 'monthly' }],
        },
        lookAheadDays: 60,
      }),
      ['2030-01-15T13:00:00.000Z', '2030-02-15T13:00:00.000Z'],
    )
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2020-03-01T13:00:00Z',
          recurrenceRules: [{ frequency: 'yearly' }],
        },
        lookAheadDays: 500,
      }),
      ['2030-03-01T13:00:00.000Z', '2031-03-01T13:00:00.000Z'],
    )
  })

  // BUG: simple series overwrite each step's time with the start's, so hourly
  // and minutely rules collapse into one occurrence per day.
  it('collapses hourly and minutely schedule occurrences into one per day', async () => {
    // Both rules step every five hours.
    for (const rule of [
      { frequency: 'hourly', interval: 5 },
      { frequency: 'minutely', interval: 300 },
    ]) {
      assert.deepEqual(
        await occurrences({
          schedule: {
            start: '2030-01-07T12:00:00Z',
            recurrenceRules: [rule],
          },
          lookAheadDays: 2,
        }),
        [
          '2030-01-07T12:00:00.000Z',
          '2030-01-08T12:00:00.000Z',
          '2030-01-09T12:00:00.000Z',
        ],
        rule.frequency,
      )
    }
  })

  // Limitation: weekly rules walk at most 1000 weeks and simple rules at most
  // 5000 steps from the start, so old schedules stop producing occurrences.
  it('stops expanding schedule occurrences after 1000 weeks or 5000 steps', async () => {
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2010-01-05T00:00:00Z',
          recurrenceRules: [{ frequency: 'weekly', byHour: [13] }],
        },
      }),
      [],
    )
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2029-01-01T00:00:00Z',
          recurrenceRules: [{ frequency: 'hourly' }],
        },
      }),
      [],
    )
  })

  it('keeps the first maxOccurrences distinct schedule occurrences in rule order', async () => {
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2030-01-07T00:00:00Z',
          recurrenceRules: [
            { frequency: 'daily', byHour: [20] },
            { frequency: 'daily', byHour: [14] },
          ],
        },
        maxOccurrences: 3,
      }),
      [
        '2030-01-07T20:00:00.000Z',
        '2030-01-08T20:00:00.000Z',
        '2030-01-09T20:00:00.000Z',
      ],
    )
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2030-01-06T00:00:00Z',
          recurrenceRules: [
            { frequency: 'weekly', byDay: ['TU', 'TH'], byHour: [13] },
          ],
        },
        maxOccurrences: 3,
      }),
      [
        '2030-01-08T13:00:00.000Z',
        '2030-01-10T13:00:00.000Z',
        '2030-01-15T13:00:00.000Z',
      ],
    )
    // Overlapping rules produce each time once.
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2030-01-07T13:00:00Z',
          recurrenceRules: [{ frequency: 'daily' }, { frequency: 'daily' }],
        },
        lookAheadDays: 2,
      }),
      ['2030-01-07T13:00:00.000Z', '2030-01-08T13:00:00.000Z'],
    )
  })

  it('returns no schedule occurrences for rules that end or start outside the window before their first step', async () => {
    // until is before the start, so the series ends at its first step.
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2030-01-08T13:00:00Z',
          recurrenceRules: [
            { frequency: 'daily', until: '2030-01-08T12:00:00Z' },
          ],
        },
      }),
      [],
    )
    // The first week already starts after the lookahead.
    assert.deepEqual(
      await occurrences({
        schedule: {
          start: '2030-03-01T13:00:00Z',
          recurrenceRules: [{ frequency: 'weekly' }],
        },
        lookAheadDays: 30,
      }),
      [],
    )
  })
})
