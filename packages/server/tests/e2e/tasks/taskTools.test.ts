import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, beforeEach, describe, it, mock } from 'node:test'
import { testApiHandler } from 'next-test-api-route-handler'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTaskTestContext } from '../../lib/tasks/createTaskTestContext'
import { createTaskToolFunctions } from '../../lib/tasks/createTaskToolFunctions'
import { createTestTask } from '../../lib/tasks/createTestTask'
import { taskDeliveryId } from '../../lib/tasks/taskDeliveryId'
import { callRoute } from '../../lib/http/callRoute'
import {
  startFakeQstash,
  type FakeQstashPublish,
} from '../../lib/qstash/startFakeQstash'
import { startFakeLlm, type FakeLlmToolCall } from '../../lib/llm/startFakeLlm'
import { toolOutputs } from '../../lib/llm/toolOutputs'
import { waitFor } from '../../lib/async/waitFor'

// The model manages tasks through assistant functions backed by task
// handlers. Each test scripts the fake LLM to call those tools during a real
// POST /api/messages run and inspects what the tools returned to the model.

const CALLBACK_URL = 'https://superinterface.test/api/cloud/tasks/callback'
const CONFLICT =
  'Tasks sharing a key and thread must be scheduled at least 15 minutes apart.'

const fakeQstash = await startFakeQstash()
process.env.QSTASH_URL = fakeQstash.baseURL
process.env.QSTASH_TOKEN = 'test-qstash-token'
process.env.NEXT_PUBLIC_SUPERINTERFACE_BASE_URL = 'https://superinterface.test'

// Imported by the first turn rather than up front, so the task modules are
// loaded (and their set-up runs) while that test is running.
const loadMessagesRoute = () => import('../../../src/app/api/messages/route')

const fakeLlms: Array<Awaited<ReturnType<typeof startFakeLlm>>> = []

beforeEach(() => {
  fakeQstash.reset()
})

after(async () => {
  await Promise.all(fakeLlms.map((fakeLlm) => fakeLlm.close()))
  await fakeQstash.close()
})

const inHours = (hours: number) =>
  new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

const setup = async ({
  keyTemplate = '{{userId}}',
  metadata = { userId: 'user-1' },
}: {
  keyTemplate?: string
  metadata?: Record<string, string> | null
} = {}) => {
  let pending: FakeLlmToolCall[] = []
  const fakeLlm = await startFakeLlm({
    respond: ({ index }) => {
      if (index % 2 === 0) return { toolCalls: pending }
      return { content: 'Done.' }
    },
  })
  fakeLlms.push(fakeLlm)

  const context = await createTaskTestContext({
    endpoint: fakeLlm.baseURL,
    threadData: { metadata: metadata ?? Prisma.DbNull },
  })
  await createTaskToolFunctions({
    assistantId: context.assistant.id,
    keyTemplate,
  })

  // One user turn: the model makes `toolCalls`, then replies "Done.".
  const turn = async ({ toolCalls }: { toolCalls: FakeLlmToolCall[] }) => {
    pending = toolCalls
    const before = fakeLlm.completionRequests().length

    const response = await callRoute({
      appHandler: await loadMessagesRoute(),
      method: 'POST',
      body: {
        assistantId: context.assistant.id,
        publicApiKey: context.publicApiKey.value,
        threadId: context.thread.id,
        content: 'Manage my tasks',
      },
    })
    assert.equal(response.status, 200)

    const requests = fakeLlm.completionRequests()
    assert.equal(requests.length, before + 2)
    // The request replays the whole thread: keep this turn's outputs.
    return toolOutputs({ request: requests[requests.length - 1] })
      .map(({ output }) => output)
      .slice(-toolCalls.length)
  }

  // Starts a turn and reads the message stream for at most `milliseconds`,
  // for runs that never finish. Returns the event names seen so far.
  const streamFor = async ({
    toolCalls,
    milliseconds,
  }: {
    toolCalls: FakeLlmToolCall[]
    milliseconds: number
  }) => {
    pending = toolCalls
    let text = ''
    let finished = false

    await testApiHandler({
      appHandler: await loadMessagesRoute(),
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assistantId: context.assistant.id,
            publicApiKey: context.publicApiKey.value,
            threadId: context.thread.id,
            content: 'Manage my tasks',
          }),
        })
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        const deadline = Date.now() + milliseconds

        while (!finished) {
          const result = await Promise.race([
            reader.read(),
            new Promise<null>((resolve) =>
              setTimeout(() => resolve(null), deadline - Date.now()),
            ),
          ])
          if (!result) break
          if (result.done) finished = true
          else text += decoder.decode(result.value)
        }

        await reader.cancel().catch(() => undefined)
      },
    })

    return {
      finished,
      events: Array.from(text.matchAll(/"event":"([^"]+)"/g)).map(
        ([, event]) => event,
      ),
    }
  }

  return { ...context, fakeLlm, turn, streamFor }
}

const parse = (output: string | undefined) => JSON.parse(output ?? 'null')

const delaySeconds = ({ publish }: { publish: FakeQstashPublish }) =>
  Number(publish.headers['upstash-delay'].replace(/s$/, ''))

// Waits for `count` log rows in the test's workspace and returns them sorted
// by message, with the fields a task tool sets when it refuses input.
const workspaceLogs = async ({
  context,
  count,
}: {
  context: Awaited<ReturnType<typeof setup>>
  count: number
}) => {
  const logs = await waitFor({
    check: async () => {
      const rows = await prisma.log.findMany({
        where: { workspaceId: context.workspace.id },
        orderBy: { message: 'asc' },
      })
      return rows.length >= count ? rows : null
    },
  })

  return logs.map((log) => ({
    message: log.message,
    requestMethod: log.requestMethod,
    requestRoute: log.requestRoute,
    level: log.level,
    status: log.status,
    assistantId: log.assistantId,
    threadId: log.threadId,
  }))
}

// The log row expected for a refused task tool call on the test's thread.
const refusalLog = ({
  context,
  message,
}: {
  context: Awaited<ReturnType<typeof setup>>
  message: string
}) => ({
  message,
  requestMethod: 'POST',
  requestRoute: 'MESSAGES',
  level: 'ERROR',
  status: 400,
  assistantId: context.assistant.id,
  threadId: context.thread.id,
})

describe('task tools across a conversation', () => {
  it('create_task, list_tasks, update_task and delete_task manage a task schedule and its delivery', async () => {
    const { thread, turn } = await setup()
    const start = inHours(2)
    const schedule = { start, recurrenceRules: [{ frequency: 'daily' }] }

    const [createdOutput] = await turn({
      toolCalls: [
        {
          name: 'create_task',
          arguments: { title: 'Standup', message: 'Daily standup', schedule },
        },
      ],
    })
    const created = parse(createdOutput).task
    assert.equal(created.title, 'Standup')
    assert.equal(created.key, 'user-1')
    assert.deepEqual(created.schedule, schedule)

    // The delivery is queued for the first occurrence with bounded retries,
    // a callback timeout and an id derived from the task and occurrence.
    assert.equal(fakeQstash.publishes.length, 1)
    const [publish] = fakeQstash.publishes
    assert.equal(publish.destination, CALLBACK_URL)
    assert.deepEqual(publish.body, { taskId: created.id })
    assert.ok(delaySeconds({ publish }) > 7100)
    assert.ok(delaySeconds({ publish }) <= 7200)
    assert.equal(publish.headers['upstash-retries'], '2')
    assert.equal(publish.headers['upstash-timeout'], '15m')
    assert.equal(
      publish.headers['upstash-deduplication-id'],
      taskDeliveryId({ task: created, nextIso: start }),
    )

    // Ten minutes after an occurrence conflicts; a start in the past is
    // refused with the current time.
    const [conflict, past] = await turn({
      toolCalls: [
        {
          name: 'create_task',
          arguments: {
            title: 'Too close',
            message: 'x',
            schedule: { start: inHours(2 + 24 + 1 / 6) },
          },
        },
        {
          name: 'create_task',
          arguments: {
            title: 'Late',
            message: 'x',
            schedule: { start: '2020-01-01T09:00:00Z' },
          },
        },
      ],
    })
    assert.equal(conflict, CONFLICT)
    assert.match(
      past ?? '',
      /^Schedule must be in the future\. Current time: \d{4}-\d\d-\d\dT[\d:.]+Z in UTC$/,
    )

    // Conflict checks only look at the next 120 occurrences of a schedule
    // and one year ahead, so these overlapping tasks are all accepted.
    const accepted: string[] = []
    for (const hours of [2 + 24 * 150, 24 * 400, 24 * 400 + 1 / 12]) {
      const [output] = await turn({
        toolCalls: [
          {
            name: 'create_task',
            arguments: {
              title: `In ${hours} hours`,
              message: 'x',
              schedule: { start: inHours(hours) },
            },
          },
        ],
      })
      accepted.push(parse(output).task.id)
    }

    const [listOutput] = await turn({
      toolCalls: [{ name: 'list_tasks', arguments: {} }],
    })
    assert.deepEqual(
      parse(listOutput).tasks.map(({ id }: { id: string }) => id),
      [...accepted].reverse().concat(created.id),
    )

    const moved = {
      start: inHours(3),
      recurrenceRules: [{ frequency: 'daily' }],
    }
    fakeQstash.reset()
    const [updatedOutput] = await turn({
      toolCalls: [
        {
          name: 'update_task',
          arguments: {
            taskId: created.id,
            title: 'Standup moved',
            schedule: moved,
          },
        },
      ],
    })
    const updated = parse(updatedOutput).task
    assert.equal(updated.title, 'Standup moved')
    assert.equal(updated.message, 'Daily standup')
    assert.deepEqual(updated.schedule, moved)
    assert.deepEqual(fakeQstash.deletes, [publish.messageId])
    assert.equal(fakeQstash.publishes.length, 1)
    const [requeued] = fakeQstash.publishes
    assert.ok(delaySeconds({ publish: requeued }) > 10700)
    assert.ok(delaySeconds({ publish: requeued }) <= 10800)

    const [deletedOutput] = await turn({
      toolCalls: [{ name: 'delete_task', arguments: { taskId: created.id } }],
    })
    assert.equal(parse(deletedOutput).task.id, created.id)
    assert.deepEqual(fakeQstash.deletes, [
      publish.messageId,
      requeued.messageId,
    ])
    assert.equal(
      await prisma.task.count({ where: { threadId: thread.id } }),
      accepted.length,
    )
  })
})

describe('create_task tool', () => {
  it('creates a task keyed from thread metadata and schedules its delivery', async () => {
    const { thread, turn } = await setup()
    const start = inHours(2)

    const [output] = await turn({
      toolCalls: [
        {
          name: 'create_task',
          arguments: {
            title: 'Water plants',
            message: 'Remind me to water the plants',
            schedule: { start },
          },
        },
      ],
    })

    const { task } = parse(output)
    assert.equal(task.title, 'Water plants')
    assert.equal(task.key, 'user-1')
    assert.equal(task.threadId, thread.id)
    assert.deepEqual(task.schedule, { start })

    assert.equal(fakeQstash.publishes.length, 1)
    assert.equal(fakeQstash.publishes[0].destination, CALLBACK_URL)
    assert.deepEqual(fakeQstash.publishes[0].body, { taskId: task.id })
    const dbTask = await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
    })
    assert.equal(dbTask.qstashMessageId, fakeQstash.publishes[0].messageId)
  })

  it('resolves threadId and assistantId placeholders on a thread without metadata', async () => {
    const { thread, assistant, turn } = await setup({
      keyTemplate: '{{ threadId }}:{{assistantId}}',
      metadata: null,
    })

    const [output] = await turn({
      toolCalls: [
        {
          name: 'create_task',
          arguments: {
            title: 'A',
            message: 'B',
            schedule: { start: inHours(1) },
          },
        },
      ],
    })

    assert.equal(parse(output).task.key, `${thread.id}:${assistant.id}`)
  })

  it('reports invalid tool input back to the model', async () => {
    const context = await setup()
    const { thread, turn } = context

    const outputs = await turn({
      toolCalls: [
        { name: 'create_task', arguments: '{not json' },
        {
          name: 'create_task',
          arguments: { message: 'No title', schedule: { start: inHours(1) } },
        },
        {
          name: 'create_task',
          arguments: { title: 'No schedule', message: 'x' },
        },
        {
          name: 'create_task',
          arguments: { title: 'Bad', message: 'x', schedule: { at: 'noon' } },
        },
      ],
    })

    assert.equal(outputs[0], 'Invalid arguments.')
    assert.match(outputs[1] ?? '', /title/)
    assert.equal(outputs[2], 'Invalid schedule.')
    assert.match(outputs[3] ?? '', /start/)
    assert.equal(await prisma.task.count({ where: { threadId: thread.id } }), 0)
    assert.equal(fakeQstash.publishes.length, 0)
    // Unparseable arguments and an invalid schedule are also logged.
    assert.deepEqual(await workspaceLogs({ context, count: 2 }), [
      refusalLog({
        context,
        message:
          "Failed parsing task function arguments: Expected property name or '}' in JSON at position 1 (line 1 column 2)",
      }),
      refusalLog({ context, message: 'Invalid schedule provided.' }),
    ])
  })

  it('tells the model the current time when the schedule is in the past', async () => {
    const context = await setup()
    const { turn } = context

    const [withZone, withoutZone] = await turn({
      toolCalls: [
        {
          name: 'create_task',
          arguments: {
            title: 'Late',
            message: 'x',
            schedule: {
              start: '2020-01-01T09:00:00',
              timeZone: 'Europe/Vilnius',
            },
          },
        },
        {
          name: 'create_task',
          arguments: {
            title: 'Late',
            message: 'x',
            schedule: { start: '2020-01-01T09:00:00Z' },
          },
        },
      ],
    })

    assert.match(
      withZone ?? '',
      /^Schedule must be in the future\. Current time: \d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+0[23]:00 in timezone Europe\/Vilnius$/,
    )
    assert.match(
      withoutZone ?? '',
      /^Schedule must be in the future\. Current time: \d{4}-\d\d-\d\dT[\d:.]+Z in UTC$/,
    )
    // Both refusals are logged with the same message the model got.
    assert.deepEqual(
      await workspaceLogs({ context, count: 2 }),
      [withoutZone, withZone]
        .map((message) => refusalLog({ context, message: message ?? '' }))
        .sort((a, b) => (a.message < b.message ? -1 : 1)),
    )
  })

  it('refuses when the key template needs a missing thread variable', async () => {
    const context = await setup({
      keyTemplate: '{{orgId}}-{{userId}}-{{teamId}}',
    })
    const { thread, turn } = context

    const [output] = await turn({
      toolCalls: [
        {
          name: 'create_task',
          arguments: {
            title: 'A',
            message: 'B',
            schedule: { start: inHours(1) },
          },
        },
      ],
    })

    assert.equal(output, 'Missing variables in key template: orgId, teamId')
    assert.equal(await prisma.task.count({ where: { threadId: thread.id } }), 0)
    assert.deepEqual(await workspaceLogs({ context, count: 1 }), [
      refusalLog({
        context,
        message: 'Missing variables in key template: orgId, teamId',
      }),
    ])
  })

  it('refuses a task within 15 minutes of another with the same key', async () => {
    const { thread, turn } = await setup()
    const start = inHours(3)
    await createTestTask({
      data: { threadId: thread.id, key: 'user-1', schedule: { start } },
    })

    const [output] = await turn({
      toolCalls: [
        {
          name: 'create_task',
          arguments: { title: 'Dup', message: 'x', schedule: { start } },
        },
      ],
    })

    assert.equal(output, CONFLICT)
    assert.equal(await prisma.task.count({ where: { threadId: thread.id } }), 1)
  })
})

describe('task tools and stored schedules with an unknown time zone', () => {
  // BUG: the conflict check throws on the stored schedule. The task tools do
  // not catch it, so the tool call never gets an output and the message
  // stream stays open without the run ever completing or failing.
  for (const name of ['create_task', 'update_task']) {
    it(`leaves the run hanging when ${name} hits the broken schedule`, async () => {
      const { thread, fakeLlm, streamFor } = await setup()
      await createTestTask({
        data: {
          threadId: thread.id,
          key: 'user-1',
          schedule: { start: inHours(1), timeZone: 'Mars/Olympus' },
        },
      })
      const sibling = await createTestTask({
        data: {
          threadId: thread.id,
          key: 'user-1',
          schedule: { start: inHours(9) },
        },
      })
      const toolCall =
        name === 'create_task'
          ? {
              name,
              arguments: {
                title: 'A',
                message: 'B',
                schedule: { start: inHours(5) },
              },
            }
          : { name, arguments: { taskId: sibling.id, title: 'Renamed' } }
      const consoleError = mock.method(console, 'error', () => undefined)

      try {
        const { events, finished } = await streamFor({
          milliseconds: 1500,
          toolCalls: [toolCall],
        })

        assert.equal(finished, false)
        assert.ok(
          events.includes('thread.run.requires_action'),
          events.join(','),
        )
        assert.ok(!events.includes('thread.run.completed'))
        assert.ok(!events.includes('thread.run.failed'))
        assert.equal(fakeLlm.completionRequests().length, 1)
        assert.equal(
          await prisma.task.count({ where: { threadId: thread.id } }),
          2,
        )
        const unchanged = await prisma.task.findUniqueOrThrow({
          where: { id: sibling.id },
        })
        assert.equal(unchanged.title, 'Test Task')
        // The tool rethrows the conflict check's own RangeError unchanged and
        // the server adapter logs `err.message || err`: any other error (one
        // without this message) would log a different line.
        assert.equal(consoleError.mock.callCount(), 1)
        assert.equal(
          consoleError.mock.calls[0].arguments[0],
          'Unexpected error while handling request: Invalid time zone specified: Mars/Olympus',
        )
      } finally {
        consoleError.mock.restore()
      }
    })
  }
})

describe('list_tasks tool', () => {
  it('lists only tasks with the resolved key', async () => {
    const { thread, turn } = await setup()
    const mine = await createTestTask({
      data: { threadId: thread.id, key: 'user-1', title: 'Mine' },
    })
    await createTestTask({
      data: { threadId: thread.id, key: 'user-2', title: 'Theirs' },
    })

    const [output] = await turn({
      toolCalls: [{ name: 'list_tasks', arguments: '' }],
    })

    assert.deepEqual(
      parse(output).tasks.map(({ id }: { id: string }) => id),
      [mine.id],
    )
  })

  it('reports invalid input and missing key variables', async () => {
    const { turn } = await setup({ keyTemplate: '{{userId}}' })

    const outputs = await turn({
      toolCalls: [
        { name: 'list_tasks', arguments: 'null' },
        { name: 'list_tasks', arguments: '"everything"' },
        { name: 'list_tasks', arguments: '[oops' },
      ],
    })

    assert.match(outputs[0] ?? '', /Expected object, received null/)
    assert.match(outputs[1] ?? '', /Expected object, received string/)
    assert.equal(outputs[2], 'Invalid arguments.')

    const noUser = await setup({ metadata: {} })
    const [missing] = await noUser.turn({
      toolCalls: [{ name: 'list_tasks', arguments: {} }],
    })
    assert.equal(missing, 'Missing variables in key template: userId')
  })
})

describe('update_task tool', () => {
  it('updates every field, cancels the old delivery and schedules the new one', async () => {
    const { thread, turn } = await setup()
    const task = await createTestTask({
      data: {
        threadId: thread.id,
        key: 'user-1',
        schedule: { start: inHours(1) },
        qstashMessageId: 'msg_old',
      },
    })
    const start = inHours(5)

    const [output] = await turn({
      toolCalls: [
        {
          name: 'update_task',
          arguments: {
            taskId: task.id,
            title: 'New title',
            message: 'New message',
            schedule: { start },
            key: 'user-1-archive',
          },
        },
      ],
    })

    const updated = parse(output).task
    assert.equal(updated.title, 'New title')
    assert.equal(updated.message, 'New message')
    assert.equal(updated.key, 'user-1-archive')
    assert.deepEqual(updated.schedule, { start })
    assert.deepEqual(fakeQstash.deletes, ['msg_old'])
    assert.equal(fakeQstash.publishes.length, 1)
    assert.deepEqual(fakeQstash.publishes[0].body, { taskId: task.id })
  })

  it('keeps the stored schedule and key when only the title changes', async () => {
    const { thread, turn } = await setup()
    const start = inHours(2)
    const task = await createTestTask({
      data: { threadId: thread.id, key: 'user-1', schedule: { start } },
    })

    const [output] = await turn({
      toolCalls: [
        { name: 'update_task', arguments: { taskId: task.id, title: 'Only' } },
      ],
    })

    const updated = parse(output).task
    assert.equal(updated.title, 'Only')
    assert.equal(updated.message, 'Test message')
    assert.equal(updated.key, 'user-1')
    assert.deepEqual(updated.schedule, { start })
    assert.deepEqual(fakeQstash.deletes, [])
    assert.equal(fakeQstash.publishes.length, 1)
  })

  it('refuses an update that would conflict with another task', async () => {
    const { thread, turn } = await setup()
    const busy = inHours(4)
    await createTestTask({
      data: { threadId: thread.id, key: 'user-1', schedule: { start: busy } },
    })
    const task = await createTestTask({
      data: {
        threadId: thread.id,
        key: 'user-1',
        schedule: { start: inHours(8) },
      },
    })

    const [output] = await turn({
      toolCalls: [
        {
          name: 'update_task',
          arguments: { taskId: task.id, schedule: { start: busy } },
        },
      ],
    })

    assert.equal(output, CONFLICT)
    assert.equal(fakeQstash.publishes.length, 0)
  })

  it('reports invalid input, missing keys and tasks outside the key', async () => {
    const { thread, turn } = await setup()
    const foreign = await createTestTask({
      data: { threadId: thread.id, key: 'user-2' },
    })

    const outputs = await turn({
      toolCalls: [
        { name: 'update_task', arguments: '{' },
        { name: 'update_task', arguments: { title: 'No id' } },
        { name: 'update_task', arguments: { taskId: foreign.id, title: 'x' } },
        {
          name: 'update_task',
          arguments: { taskId: randomUUID(), title: 'x' },
        },
        {
          name: 'update_task',
          arguments: { taskId: foreign.id, schedule: { start: 'soon' } },
        },
      ],
    })

    assert.equal(outputs[0], 'Invalid arguments.')
    assert.match(outputs[1] ?? '', /taskId/)
    assert.equal(outputs[2], 'Task not found.')
    assert.equal(outputs[3], 'Task not found.')
    assert.match(outputs[4] ?? '', /start/)

    const noUser = await setup({ metadata: {} })
    const [missing] = await noUser.turn({
      toolCalls: [{ name: 'update_task', arguments: { taskId: foreign.id } }],
    })
    assert.equal(missing, 'Missing variables in key template: userId')
  })
})

describe('delete_task tool', () => {
  it('deletes the task and cancels its delivery', async () => {
    const { thread, turn } = await setup()
    const task = await createTestTask({
      data: { threadId: thread.id, key: 'user-1', qstashMessageId: 'msg_del' },
    })

    const [output] = await turn({
      toolCalls: [{ name: 'delete_task', arguments: { taskId: task.id } }],
    })

    assert.equal(parse(output).task.id, task.id)
    assert.deepEqual(fakeQstash.deletes, ['msg_del'])
    assert.equal(await prisma.task.findUnique({ where: { id: task.id } }), null)
  })

  it('reports invalid input, missing keys and tasks outside the key', async () => {
    const { thread, turn } = await setup()
    const foreign = await createTestTask({
      data: { threadId: thread.id, key: 'user-2' },
    })

    const outputs = await turn({
      toolCalls: [
        { name: 'delete_task', arguments: 'nope' },
        { name: 'delete_task', arguments: {} },
        { name: 'delete_task', arguments: { taskId: foreign.id } },
      ],
    })

    assert.equal(outputs[0], 'Invalid arguments.')
    assert.match(outputs[1] ?? '', /taskId/)
    assert.equal(outputs[2], 'Task not found.')
    assert.ok(await prisma.task.findUnique({ where: { id: foreign.id } }))

    const noUser = await setup({ metadata: {} })
    const [missing] = await noUser.turn({
      toolCalls: [{ name: 'delete_task', arguments: { taskId: foreign.id } }],
    })
    assert.equal(missing, 'Missing variables in key template: userId')
  })
})
