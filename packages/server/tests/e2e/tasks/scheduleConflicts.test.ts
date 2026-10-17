import assert from 'node:assert/strict'
import { after, describe, it, mock } from 'node:test'
import { Prisma } from '@prisma/client'
import { createTaskTestContext } from '../../lib/tasks/createTaskTestContext'
import { createTestTask } from '../../lib/tasks/createTestTask'
import { callRoute } from '../../lib/http/callRoute'
import { startFakeQstash } from '../../lib/qstash/startFakeQstash'

// Conflict detection expands every task schedule into concrete occurrences
// (one year ahead, at most 120 per schedule). These tests drive many schedule
// shapes through POST /api/tasks and observe whether a candidate time is
// rejected as overlapping an existing task on the same thread and key.

// Monday 2030-01-07 12:00 UTC.
const NOW = new Date('2030-01-07T12:00:00.000Z')
const CONFLICT =
  'Tasks sharing a key and thread must be scheduled at least 15 minutes apart.'
const CREATED = 'created'
const CALLBACK_URL = 'https://superinterface.test/api/cloud/tasks/callback'

process.env.TZ = 'UTC'

const fakeQstash = await startFakeQstash()
process.env.QSTASH_URL = fakeQstash.baseURL
process.env.QSTASH_TOKEN = 'test-qstash-token'
process.env.NEXT_PUBLIC_SUPERINTERFACE_BASE_URL = 'https://superinterface.test'

mock.timers.enable({ apis: ['Date'], now: NOW })

// Imported by the first request rather than up front, so the conflict
// modules are loaded (and their constants set) while that test is running.
const loadTasksRoute = () => import('../../../src/app/api/tasks/route')

after(async () => {
  mock.timers.reset()
  await fakeQstash.close()
})

const inMinutes = (minutes: number) =>
  new Date(NOW.getTime() + minutes * 60 * 1000).toISOString()

const DAY_MINUTES = 24 * 60

type Schedule = unknown

// Stores `existing` schedules directly (they may predate today's validation),
// then POSTs each candidate in turn and reports the outcome of each.
const outcomes = async ({
  existing,
  candidates,
}: {
  existing: Schedule[]
  candidates: Schedule[]
}) => {
  const { authorization, thread } = await createTaskTestContext()

  for (const schedule of existing) {
    await createTestTask({
      data: {
        threadId: thread.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        schedule: schedule as any,
      },
    })
  }

  const results: string[] = []

  for (const schedule of candidates) {
    const response = await callRoute({
      appHandler: await loadTasksRoute(),
      method: 'POST',
      authorization,
      body: {
        title: 'Candidate',
        message: 'Hi',
        threadId: thread.id,
        schedule,
      },
    })

    results.push(response.status === 200 ? CREATED : response.json.error)
  }

  return results
}

const at = (iso: string) => ({ start: iso })

describe('schedule conflicts: limits', () => {
  it('keeps task schedules fifteen minutes apart, up to max occurrences and lookahead days ahead, queued on the default QStash scheduler', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          // Daily at 13:00 from today: only its first 120 occurrences
          // (through 2030-05-06) are compared.
          {
            start: '2030-01-07T13:00:00Z',
            recurrenceRules: [{ frequency: 'daily' }],
          },
          // More than a year (365 days) ahead: never compared.
          at('2031-01-08T13:00:00Z'),
        ],
        candidates: [
          at('2030-01-08T13:14:00Z'),
          at('2030-01-08T13:15:00Z'),
          at('2030-07-01T13:05:00Z'),
          at('2031-01-08T13:05:00Z'),
        ],
      }),
      [CONFLICT, CREATED, CREATED, CREATED],
    )
    assert.deepEqual(
      fakeQstash.publishes.map(({ destination, headers }) => [
        destination,
        headers['upstash-delay'],
      ]),
      [
        [CALLBACK_URL, `${25 * 60 * 60 + 15 * 60}s`],
        [CALLBACK_URL, `${(175 * 24 + 1) * 60 * 60 + 5 * 60}s`],
        [CALLBACK_URL, `${(366 * 24 + 1) * 60 * 60 + 5 * 60}s`],
      ],
    )

    // Browsers preflight the same route before posting tasks.
    const preflight = await callRoute({
      appHandler: await loadTasksRoute(),
      method: 'OPTIONS',
    })
    assert.equal(preflight.status, 200)
    assert.deepEqual(preflight.json, {})
    assert.equal(
      preflight.headers.get('access-control-allow-methods'),
      'GET, POST, PUT, DELETE, OPTIONS',
    )
  })
})

describe('schedule conflicts: stored schedules', () => {
  it('ignores stored schedules that cannot produce occurrences', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          Prisma.JsonNull,
          'tomorrow',
          { recurrenceRules: [{ frequency: 'daily' }] },
          { start: 'not a date' },
        ],
        candidates: [at(inMinutes(60))],
      }),
      [CREATED],
    )
  })

  it('treats non-array recurrence rules as a one-off at the start time', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [{ start: inMinutes(60), recurrenceRules: 'daily' }],
        candidates: [at(inMinutes(60 + DAY_MINUTES)), at(inMinutes(65))],
      }),
      [CREATED, CONFLICT],
    )
  })

  it('skips malformed rules and still honours valid ones', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: inMinutes(60),
            recurrenceRules: [
              null,
              'daily',
              { interval: 1 },
              { frequency: 'daily' },
            ],
          },
        ],
        candidates: [at(inMinutes(60 + DAY_MINUTES + 5))],
      }),
      [CONFLICT],
    )
  })

  it('accepts upper-case frequencies from stored schedules', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-08T13:00:00Z',
            recurrenceRules: [{ frequency: 'WEEKLY' }],
          },
        ],
        candidates: [at('2030-01-15T13:05:00Z')],
      }),
      [CONFLICT],
    )
  })

  it('produces no occurrences for unknown frequencies', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: inMinutes(60),
            recurrenceRules: [{ frequency: 'fortnightly' }],
          },
        ],
        candidates: [at(inMinutes(60))],
      }),
      [CREATED],
    )
  })

  // Gap: `secondly` is a valid frequency for scheduling, but conflict
  // detection has no generator for it, so overlaps are never detected.
  it('does not detect overlaps for secondly schedules', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [at(inMinutes(60))],
        candidates: [
          {
            start: inMinutes(60),
            recurrenceRules: [{ frequency: 'secondly', interval: 3600 }],
          },
        ],
      }),
      [CREATED],
    )
  })
})

describe('schedule conflicts: one-off window', () => {
  it('only counts one-off tasks from 15 minutes ago onwards', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [at(inMinutes(-16))],
        candidates: [at(inMinutes(-2))],
      }),
      [CREATED],
    )
    assert.deepEqual(
      await outcomes({
        existing: [at(inMinutes(-14))],
        candidates: [at(inMinutes(-2))],
      }),
      [CONFLICT],
    )
  })

  it('only looks one year ahead', async () => {
    const yearMinutes = 365 * DAY_MINUTES
    assert.deepEqual(
      await outcomes({
        existing: [at(inMinutes(yearMinutes + 5))],
        candidates: [at(inMinutes(yearMinutes - 5))],
      }),
      [CREATED],
    )
    assert.deepEqual(
      await outcomes({
        existing: [at(inMinutes(yearMinutes - 1))],
        candidates: [at(inMinutes(yearMinutes - 5))],
      }),
      [CONFLICT],
    )
  })

  // BUG: getNextOccurrence reads an offset-less start in the task time zone,
  // but conflict detection reads it in the server's local zone (UTC here), so
  // the overlap check is shifted by the zone offset.
  it('reads offset-less starts in the server zone instead of the task zone', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          { start: '2030-01-08T09:00:00', timeZone: 'America/New_York' },
        ],
        candidates: [
          // 09:05 New York, five minutes after the existing task really runs.
          at('2030-01-08T14:05:00Z'),
          // 09:05 UTC, five hours before it.
          at('2030-01-08T09:05:00Z'),
        ],
      }),
      [CREATED, CONFLICT],
    )
  })
})

describe('schedule conflicts: weekly rules', () => {
  it('expands byDay/byHour/byMinute in the task time zone', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            // Tuesday 09:00 in New York.
            start: '2030-01-01T14:00:00Z',
            timeZone: 'America/New_York',
            recurrenceRules: [
              {
                frequency: 'weekly',
                byDay: ['MO', 'WE'],
                byHour: [9],
                byMinute: [0],
              },
            ],
          },
        ],
        candidates: [
          // Tuesday 09:00 New York: not a scheduled day.
          at('2030-01-08T14:00:00Z'),
          // Wednesday 09:05 New York.
          at('2030-01-09T14:05:00Z'),
        ],
      }),
      [CREATED, CONFLICT],
    )
  })

  it('repeats on the start weekday when byDay is missing or empty', async () => {
    for (const rule of [
      { frequency: 'weekly' },
      { frequency: 'weekly', byDay: [] },
    ]) {
      assert.deepEqual(
        await outcomes({
          existing: [
            {
              start: '2030-01-08T00:00:00Z',
              recurrenceRules: [{ ...rule, byHour: [13] }],
            },
          ],
          candidates: [at('2030-01-23T13:00:00Z'), at('2030-01-22T13:10:00Z')],
        }),
        [CREATED, CONFLICT],
      )
    }
  })

  it('reads the weekday from the end of ordinal day codes', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-08T13:00:00Z',
            recurrenceRules: [{ frequency: 'weekly', byDay: ['+1th'] }],
          },
        ],
        candidates: [at('2030-01-08T13:00:00Z'), at('2030-01-10T13:00:00Z')],
      }),
      [CREATED, CONFLICT],
    )
  })

  it('falls back to the start weekday when no day code is recognised', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-08T13:00:00Z',
            recurrenceRules: [{ frequency: 'weekly', byDay: ['XX'] }],
          },
        ],
        candidates: [at('2030-01-15T13:00:00Z')],
      }),
      [CONFLICT],
    )
  })

  it('skips weeks according to the interval', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2029-12-31T13:00:00Z',
            recurrenceRules: [
              { frequency: 'weekly', interval: 2, byDay: ['MO'] },
            ],
          },
        ],
        candidates: [at('2030-01-21T13:00:00Z'), at('2030-01-28T13:05:00Z')],
      }),
      [CREATED, CONFLICT],
    )
  })

  it('stops after count occurrences', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-08T00:00:00Z',
            recurrenceRules: [{ frequency: 'weekly', count: 2, byHour: [13] }],
          },
        ],
        candidates: [at('2030-01-22T13:00:00Z'), at('2030-01-15T13:00:00Z')],
      }),
      [CREATED, CONFLICT],
    )
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-08T00:00:00Z',
            recurrenceRules: [
              {
                frequency: 'weekly',
                count: 1,
                byDay: ['TU', 'WE'],
                byHour: [13],
              },
            ],
          },
        ],
        candidates: [at('2030-01-09T13:00:00Z'), at('2030-01-08T13:00:00Z')],
      }),
      [CREATED, CONFLICT],
    )
  })

  it('produces nothing for a zero count', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-08T13:00:00Z',
            recurrenceRules: [{ frequency: 'weekly', count: 0 }],
          },
        ],
        candidates: [at('2030-01-08T13:00:00Z')],
      }),
      [CREATED],
    )
  })

  it('stops at until, whether it falls between days or within a day', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-08T00:00:00Z',
            recurrenceRules: [
              {
                frequency: 'weekly',
                byHour: [13],
                until: '2030-01-16T00:00:00Z',
              },
            ],
          },
        ],
        candidates: [at('2030-01-22T13:00:00Z'), at('2030-01-15T13:00:00Z')],
      }),
      [CREATED, CONFLICT],
    )
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-08T00:00:00Z',
            recurrenceRules: [
              {
                frequency: 'weekly',
                byHour: [13],
                until: '2030-01-15T10:00:00Z',
              },
            ],
          },
        ],
        candidates: [at('2030-01-15T13:00:00Z'), at('2030-01-08T13:00:00Z')],
      }),
      [CREATED, CONFLICT],
    )
  })

  it('limits occurrences to byMonth', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-07T13:00:00Z',
            recurrenceRules: [
              { frequency: 'weekly', byDay: ['MO'], byMonth: [2] },
            ],
          },
        ],
        candidates: [at('2030-01-14T13:00:00Z'), at('2030-02-04T13:00:00Z')],
      }),
      [CREATED, CONFLICT],
    )
  })

  it('treats an empty weekly byMonth as every month', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-07T00:00:00Z',
            recurrenceRules: [
              { frequency: 'weekly', byMonth: [], byHour: [13] },
            ],
          },
        ],
        candidates: [at('2030-01-14T13:00:00Z')],
      }),
      [CONFLICT],
    )
  })

  it('combines several hours, minutes and seconds per day', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-08T07:00:00Z',
            recurrenceRules: [
              {
                frequency: 'weekly',
                byHour: [17, 8, 8],
                byMinute: [30],
                bySecond: [0],
              },
            ],
          },
        ],
        candidates: [at('2030-01-08T12:30:00Z'), at('2030-01-15T17:35:00Z')],
      }),
      [CREATED, CONFLICT],
    )
  })

  // BUG: weekly expansion compares each day at midnight against the start, so
  // the start day itself is skipped unless the task starts at 00:00. The first
  // occurrence of a weekly task therefore never blocks a conflicting task.
  it('skips the first weekly occurrence unless the task starts at midnight', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-08T13:00:00Z',
            recurrenceRules: [{ frequency: 'weekly' }],
          },
        ],
        candidates: [at('2030-01-08T13:05:00Z'), at('2030-01-15T13:05:00Z')],
      }),
      [CREATED, CONFLICT],
    )
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-08T00:00:00Z',
            recurrenceRules: [{ frequency: 'weekly', byHour: [13] }],
          },
        ],
        candidates: [at('2030-01-08T13:05:00Z')],
      }),
      [CONFLICT],
    )
  })

  // Out-of-range by-values roll over into neighbouring days: byHour -1 on a
  // Monday means Sunday 23:00. On the start day that falls before the start
  // and is dropped; later weeks keep it.
  it('drops weekly times that roll back to before the start', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-14T00:00:00Z',
            recurrenceRules: [{ frequency: 'weekly', byHour: [-1] }],
          },
        ],
        candidates: [at('2030-01-13T23:00:00Z'), at('2030-01-20T23:05:00Z')],
      }),
      [CREATED, CONFLICT],
    )
  })

  // Limitation: weekly expansion walks at most 1000 weeks from the start, so a
  // weekly task started ~20 years ago no longer takes part in conflict checks.
  it('stops expanding weekly rules after 1000 weeks', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2000-01-04T13:00:00Z',
            recurrenceRules: [{ frequency: 'weekly' }],
          },
        ],
        candidates: [at('2030-01-08T13:00:00Z')],
      }),
      [CREATED],
    )
  })

  it('caps expansion at 120 occurrences across all rules', async () => {
    const everyHour = Array.from({ length: 24 }, (_, hour) => hour)
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-07T12:00:00Z',
            recurrenceRules: [
              {
                frequency: 'weekly',
                byDay: ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'],
                byHour: everyHour,
                byMinute: [0],
              },
              // Never reached: the first rule already fills the cap.
              { frequency: 'daily', byHour: [5], byMinute: [30] },
            ],
          },
        ],
        candidates: [
          at('2030-01-20T05:00:00Z'),
          at('2030-01-20T05:30:00Z'),
          at('2030-01-08T05:00:00Z'),
        ],
      }),
      [CREATED, CREATED, CONFLICT],
    )
  })
})

describe('schedule conflicts: daily and other simple rules', () => {
  it('expands daily byHour in the task time zone', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            // 09:00 in Vilnius.
            start: '2030-01-01T07:00:00Z',
            timeZone: 'Europe/Vilnius',
            recurrenceRules: [{ frequency: 'daily', byHour: [9, 18] }],
          },
        ],
        candidates: [at('2030-01-08T12:00:00Z'), at('2030-01-08T16:05:00Z')],
      }),
      [CREATED, CONFLICT],
    )
  })

  // BUG: dayjs time-zone comparisons are off by an hour for wall times just
  // before a DST switch, so a daily task that starts at 01:00 in Vilnius on
  // the day clocks go forward loses its first occurrence, and later steps
  // land at 02:00 local instead of 01:00.
  it('mishandles a series starting just before a DST switch', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            // 2030-03-31 01:00 in Vilnius; clocks jump from 03:00 to 04:00.
            start: '2030-03-30T23:00:00Z',
            timeZone: 'Europe/Vilnius',
            recurrenceRules: [{ frequency: 'daily' }],
          },
        ],
        candidates: [
          // First occurrence (01:05 local on the 31st): missed.
          at('2030-03-30T23:05:00Z'),
          // Second occurrence (01:05 local on April 1st): missed.
          at('2030-03-31T22:05:00Z'),
          // 02:05 local on April 1st, not an occurrence: rejected.
          at('2030-03-31T23:05:00Z'),
        ],
      }),
      [CREATED, CREATED, CONFLICT],
    )
  })

  it('filters daily occurrences by weekday', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-07T13:00:00Z',
            recurrenceRules: [
              { frequency: 'daily', byDay: ['SA', 'SU'], byHour: [] },
            ],
          },
        ],
        candidates: [at('2030-01-11T13:00:00Z'), at('2030-01-12T13:00:00Z')],
      }),
      [CREATED, CONFLICT],
    )
  })

  it('treats an empty daily byDay as every day', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-07T13:00:00Z',
            recurrenceRules: [{ frequency: 'daily', byDay: [], byMonth: [] }],
          },
        ],
        candidates: [at('2030-01-09T13:00:00Z')],
      }),
      [CONFLICT],
    )
  })

  it('filters daily occurrences by month', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-07T13:00:00Z',
            recurrenceRules: [{ frequency: 'daily', byMonth: [3] }],
          },
        ],
        candidates: [at('2030-01-08T13:00:00Z'), at('2030-03-01T13:00:00Z')],
      }),
      [CREATED, CONFLICT],
    )
  })

  it('stops daily rules at until', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-08T13:00:00Z',
            recurrenceRules: [
              { frequency: 'daily', until: '2030-01-10T00:00:00Z' },
            ],
          },
        ],
        candidates: [at('2030-01-10T13:00:00Z'), at('2030-01-09T13:00:00Z')],
      }),
      [CREATED, CONFLICT],
    )
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-08T13:00:00Z',
            recurrenceRules: [
              {
                frequency: 'daily',
                byHour: [9, 15],
                until: '2030-01-09T14:00:00Z',
              },
            ],
          },
        ],
        candidates: [at('2030-01-09T15:00:00Z'), at('2030-01-09T09:00:00Z')],
      }),
      [CREATED, CONFLICT],
    )
  })

  it('stops daily rules after count occurrences', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-08T13:00:00Z',
            recurrenceRules: [{ frequency: 'daily', count: 3 }],
          },
        ],
        candidates: [at('2030-01-11T13:00:00Z'), at('2030-01-10T13:00:00Z')],
      }),
      [CREATED, CONFLICT],
    )
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-08T13:00:00Z',
            recurrenceRules: [
              { frequency: 'daily', count: 3, byHour: [9, 13] },
            ],
          },
        ],
        candidates: [
          at('2030-01-08T09:00:00Z'),
          at('2030-01-10T09:00:00Z'),
          at('2030-01-09T13:00:00Z'),
        ],
      }),
      [CREATED, CREATED, CONFLICT],
    )
  })

  it('repeats monthly on the start day', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2029-11-15T13:00:00Z',
            recurrenceRules: [{ frequency: 'monthly' }],
          },
        ],
        candidates: [at('2030-01-16T13:00:00Z'), at('2030-01-15T13:05:00Z')],
      }),
      [CREATED, CONFLICT],
    )
  })

  it('repeats yearly on the start date', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2020-03-01T13:00:00Z',
            recurrenceRules: [{ frequency: 'yearly' }],
          },
        ],
        candidates: [at('2030-03-02T13:00:00Z'), at('2030-03-01T13:00:00Z')],
      }),
      [CREATED, CONFLICT],
    )
  })

  // BUG: simple series overwrite each step's hour/minute/second with the
  // start's (or byHour/byMinute/bySecond), so hourly and minutely rules
  // collapse into one occurrence per day at the start time. Real occurrences
  // are missed and a phantom daily occurrence is reported instead.
  it('collapses hourly rules into one occurrence per day', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-07T12:00:00Z',
            recurrenceRules: [{ frequency: 'hourly', interval: 5 }],
          },
        ],
        candidates: [
          // A real occurrence (12:00 + 5h), not detected.
          at('2030-01-07T17:00:00Z'),
          // Not an occurrence (36h is not a multiple of 5h), but rejected.
          at('2030-01-08T12:05:00Z'),
        ],
      }),
      [CREATED, CONFLICT],
    )
  })

  // Same bug, plus the 120-occurrence cap counts the collapsed duplicates:
  // the first 120 half-hour steps only reach three distinct days.
  it('collapses minutely rules and caps them after 120 steps', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-07T12:00:00Z',
            recurrenceRules: [{ frequency: 'minutely', interval: 30 }],
          },
        ],
        candidates: [
          at('2030-01-07T14:00:00Z'),
          at('2030-01-10T12:05:00Z'),
          at('2030-01-09T12:05:00Z'),
        ],
      }),
      [CREATED, CREATED, CONFLICT],
    )
  })

  // Limitation: simple rules walk at most 5000 steps from the start, so an
  // hourly task started more than ~208 days ago is ignored.
  it('stops expanding simple rules after 5000 steps', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2029-01-01T00:00:00Z',
            recurrenceRules: [{ frequency: 'hourly' }],
          },
        ],
        candidates: [at('2030-01-07T13:00:00Z')],
      }),
      [CREATED],
    )
  })

  it('deduplicates identical occurrences from overlapping rules', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [
          {
            start: '2030-01-07T13:00:00Z',
            recurrenceRules: [{ frequency: 'daily' }, { frequency: 'daily' }],
          },
        ],
        candidates: [at('2030-01-08T13:14:00Z')],
      }),
      [CONFLICT],
    )
  })
})

describe('schedule conflicts: recurring candidates', () => {
  it('expands the candidate schedule as well', async () => {
    assert.deepEqual(
      await outcomes({
        existing: [at('2030-01-10T09:00:00Z')],
        candidates: [
          {
            start: '2030-01-07T13:00:00Z',
            recurrenceRules: [{ frequency: 'daily', byHour: [9] }],
          },
        ],
      }),
      [CONFLICT],
    )
  })
})
