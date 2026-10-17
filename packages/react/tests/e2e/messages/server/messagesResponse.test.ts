// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import OpenAI from 'openai'
import { messagesResponse, extendMessage } from '@/server'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'
import {
  fakeMessage,
  fakeRun,
  startFakeOpenai,
  type FakeOpenaiRequest,
} from '../../../../../server/tests/lib/openai/startFakeOpenai'

// messagesResponse runs inside the server process (from react's built dist),
// out of reach of the client e2e coverage, so these tests call it the way the
// server's GET /api/messages does: with a real OpenAI client whose Assistants
// API is a local fake.

const THREAD_ID = 'thread_1'

const list = ({
  data,
  hasMore = false,
}: {
  data: { id: string }[]
  hasMore?: boolean
}) => ({
  object: 'list',
  data,
  first_id: data[0]?.id ?? null,
  last_id: data.at(-1)?.id ?? null,
  has_more: hasMore,
})

const toolCallStep = ({ id, runId }: { id: string; runId: string }) => ({
  id,
  object: 'thread.run.step',
  created_at: 1,
  run_id: runId,
  assistant_id: 'asst_fake',
  thread_id: THREAD_ID,
  type: 'tool_calls',
  status: 'in_progress',
  step_details: {
    type: 'tool_calls',
    tool_calls: [
      {
        id: `call_${id}`,
        type: 'function',
        function: { name: 'lookup', arguments: '{}', output: null },
      },
    ],
  },
  completed_at: null,
  cancelled_at: null,
  failed_at: null,
  expired_at: null,
  last_error: null,
  usage: null,
  metadata: {},
})

describe('messagesResponse', () => {
  const cleanups: (() => Promise<void> | void)[] = []

  afterEach(async () => {
    for (const fn of cleanups.splice(0)) await fn()
  })

  // A fake Assistants API serving `messages`, the thread's `runs` (newest
  // first) and each run's steps, two to a page.
  const startAssistantsApi = async ({
    messages,
    hasMore = false,
    runs = [],
    stepsByRun = {},
  }: {
    messages: ReturnType<typeof fakeMessage>[]
    hasMore?: boolean
    runs?: ReturnType<typeof fakeRun>[]
    stepsByRun?: Record<string, ReturnType<typeof toolCallStep>[]>
  }) => {
    const fakeOpenai = await startFakeOpenai({
      handle: ({ request }: { request: FakeOpenaiRequest }) => {
        const segments = request.path.split('/').filter(Boolean)
        const json = (value: unknown) => ({
          type: 'json' as const,
          json: value,
        })

        if (segments[2] === 'messages') {
          return json(list({ data: messages, hasMore }))
        }
        if (segments[2] === 'runs' && segments.length === 3) {
          return json(
            list({ data: runs.slice(0, Number(request.query.get('limit'))) }),
          )
        }
        if (segments[4] === 'steps') {
          const steps = stepsByRun[segments[3]] ?? []
          const after = request.query.get('after')
          const start = after
            ? steps.findIndex(({ id }) => id === after) + 1
            : 0
          const page = steps.slice(start, start + 2)

          return json(list({ data: page, hasMore: start + 2 < steps.length }))
        }

        return undefined
      },
    })
    cleanups.push(fakeOpenai.close)

    return {
      fakeOpenai,
      client: new OpenAI({
        apiKey: 'sk-test',
        baseURL: fakeOpenai.baseURL,
        maxRetries: 0,
      }),
    }
  }

  it('lists the first page with run steps and a placeholder for a run still in progress', async () => {
    const answeredRun = fakeRun({ threadId: THREAD_ID, status: 'completed' })
    const pendingRun = fakeRun({
      threadId: THREAD_ID,
      status: 'requires_action',
    })
    const messages = Array.from({ length: 20 }, (_, index) =>
      index === 0
        ? fakeMessage({
            threadId: THREAD_ID,
            text: 'Answer',
            runId: answeredRun.id,
          })
        : fakeMessage({
            threadId: THREAD_ID,
            text: `Message ${index}`,
            role: 'user',
          }),
    )
    const { client, fakeOpenai } = await startAssistantsApi({
      messages,
      hasMore: true,
      runs: [pendingRun, answeredRun],
      stepsByRun: {
        [answeredRun.id]: [
          toolCallStep({ id: 'a1', runId: answeredRun.id }),
          toolCallStep({ id: 'a2', runId: answeredRun.id }),
          toolCallStep({ id: 'a3', runId: answeredRun.id }),
        ],
        [pendingRun.id]: [toolCallStep({ id: 'p1', runId: pendingRun.id })],
      },
    })

    const page = await messagesResponse({ client, threadId: THREAD_ID })

    expect(page.hasNextPage).toBe(true)
    expect(page.lastId).toBe(messages.at(-1)!.id)
    expect(page.data).toHaveLength(21)

    // The pending run has no message yet, so an empty assistant message
    // stands in for it, carrying the run's steps.
    const [placeholder, answer, firstUserMessage] = page.data
    expect(isOptimistic({ id: placeholder.id })).toBe(true)
    expect(placeholder).toMatchObject({
      role: 'assistant',
      content: [],
      run_id: pendingRun.id,
      thread_id: THREAD_ID,
      status: 'completed',
    })
    expect(placeholder.runSteps.map(({ id }) => id)).toEqual(['p1'])

    // Messages of a run get all its steps, across pages of steps.
    expect(answer.runSteps.map(({ id }) => id)).toEqual(['a1', 'a2', 'a3'])
    expect(firstUserMessage.runSteps).toEqual([])

    expect(
      fakeOpenai
        .find({ method: 'GET', path: `/threads/${THREAD_ID}/messages` })[0]
        .query.get('limit'),
    ).toBe('20')
  })

  it('adds no placeholder when the latest run is answered, finished or missing', async () => {
    const answeredRun = fakeRun({ threadId: THREAD_ID, status: 'in_progress' })
    const answered = await startAssistantsApi({
      messages: [
        fakeMessage({
          threadId: THREAD_ID,
          text: 'Streaming',
          runId: answeredRun.id,
        }),
      ],
      runs: [answeredRun],
    })
    const finishedRun = fakeRun({ threadId: THREAD_ID, status: 'failed' })
    const finished = await startAssistantsApi({
      messages: [
        fakeMessage({ threadId: THREAD_ID, text: 'Hi', role: 'user' }),
      ],
      runs: [finishedRun],
    })
    const withoutRuns = await startAssistantsApi({ messages: [] })

    for (const { client } of [answered, finished, withoutRuns]) {
      const page = await messagesResponse({ client, threadId: THREAD_ID })

      expect(page.data.some(({ id }) => isOptimistic({ id }))).toBe(false)
      expect(page.hasNextPage).toBe(false)
    }
    const [streaming] = (
      await messagesResponse({ client: answered.client, threadId: THREAD_ID })
    ).data
    expect(streaming.content).toMatchObject([{ text: { value: 'Streaming' } }])
  })

  it('lists older and newer pages by cursor without looking at runs', async () => {
    const pendingRun = fakeRun({ threadId: THREAD_ID, status: 'queued' })
    const messages = [
      fakeMessage({ threadId: THREAD_ID, text: 'Old', role: 'user' }),
    ]
    const { client, fakeOpenai } = await startAssistantsApi({
      messages,
      hasMore: true,
      runs: [pendingRun],
    })

    const older = await messagesResponse({
      client,
      threadId: THREAD_ID,
      pageParam: 'msg_cursor',
    })
    const newer = await messagesResponse({
      client,
      threadId: THREAD_ID,
      before: 'msg_cursor',
    })

    for (const page of [older, newer]) {
      expect(page.data.map(({ id }) => id)).toEqual([messages[0].id])
      // Fewer messages than a page: there is no next page despite has_more.
      expect(page.hasNextPage).toBe(false)
    }
    const listRequests = fakeOpenai.find({
      method: 'GET',
      path: `/threads/${THREAD_ID}/messages`,
    })
    expect(
      listRequests.map(({ query }) => [
        query.get('after'),
        query.get('before'),
      ]),
    ).toEqual([
      ['msg_cursor', null],
      [null, 'msg_cursor'],
    ])
    expect(
      fakeOpenai.find({ method: 'GET', path: `/threads/${THREAD_ID}/runs` }),
    ).toEqual([])
  })

  it('extends a message with its run steps, or none without a run', async () => {
    const run = fakeRun({ threadId: THREAD_ID })
    const { client } = await startAssistantsApi({
      messages: [],
      stepsByRun: { [run.id]: [toolCallStep({ id: 's1', runId: run.id })] },
    })
    const withRun = fakeMessage({
      threadId: THREAD_ID,
      text: 'A',
      runId: run.id,
    })
    const withoutRun = fakeMessage({
      threadId: THREAD_ID,
      text: 'U',
      role: 'user',
    })

    expect(
      (await extendMessage({ client, message: withRun as never })).runSteps.map(
        ({ id }) => id,
      ),
    ).toEqual(['s1'])
    expect(
      (await extendMessage({ client, message: withoutRun as never })).runSteps,
    ).toEqual([])
  })
})
