// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Readable } from 'node:stream'
import OpenAI from 'openai'
import { createMessageResponse } from '@/server'
import {
  fakeMessage,
  fakeRun,
  startFakeOpenai,
  type FakeOpenaiEvent,
  type FakeOpenaiHandler,
} from '../../../../../server/tests/lib/openai/startFakeOpenai'
import { readMessageEvents } from '../../lib/readMessageEvents'

// createMessageResponse runs inside the server process (from react's built
// dist), out of reach of the client e2e coverage, so these tests call it the
// way the server's /api/messages route does: with a real OpenAI client whose
// Assistants API is a local fake, and the stream returned as the response.

const THREAD_ID = 'thread_1'

const runStep = ({
  runId,
  id = 'step_1',
  status = 'in_progress',
}: {
  runId: string
  id?: string
  status?: string
}) => ({
  id,
  object: 'thread.run.step',
  created_at: 1,
  run_id: runId,
  assistant_id: 'asst_fake',
  thread_id: THREAD_ID,
  type: 'tool_calls',
  status,
  step_details: {
    type: 'tool_calls',
    tool_calls: [
      {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'lookup',
          arguments: '{}',
          output: status === 'completed' ? 'found' : null,
        },
      },
    ],
  },
  completed_at: status === 'completed' ? 2 : null,
  cancelled_at: null,
  failed_at: null,
  expired_at: null,
  last_error: null,
  usage: null,
  metadata: {},
})

const requiredAction = {
  type: 'submit_tool_outputs',
  submit_tool_outputs: {
    tool_calls: [
      {
        id: 'call_1',
        type: 'function',
        function: { name: 'lookup', arguments: '{}' },
      },
    ],
  },
}

describe('createMessageResponse', () => {
  const cleanups: (() => Promise<void> | void)[] = []

  afterEach(async () => {
    for (const fn of cleanups.splice(0)) await fn()
  })

  // A real OpenAI client talking to a fake Assistants API whose run and tool
  // output submission streams are `runEvents` and `toolOutputEvents`.
  const startAssistantsApi = async ({
    runEvents,
    toolOutputEvents = [],
    finish,
    waitFor,
  }: {
    runEvents: FakeOpenaiEvent[]
    toolOutputEvents?: FakeOpenaiEvent[]
    finish?: 'destroy'
    waitFor?: Promise<unknown>
  }) => {
    const handle: FakeOpenaiHandler = ({ request }) => {
      if (request.method !== 'POST') return undefined
      if (request.path === `/threads/${THREAD_ID}/runs`) {
        return { type: 'sse', events: runEvents, finish, waitFor }
      }
      if (request.path.endsWith('/submit_tool_outputs')) {
        return { type: 'sse', events: toolOutputEvents }
      }

      return undefined
    }
    const fakeOpenai = await startFakeOpenai({ handle })
    cleanups.push(fakeOpenai.close)

    const client = new OpenAI({
      apiKey: 'sk-test',
      baseURL: fakeOpenai.baseURL,
      maxRetries: 0,
    })

    return {
      fakeOpenai,
      client,
      createRunStream: () =>
        client.beta.threads.runs.create(THREAD_ID, {
          assistant_id: 'asst_fake',
          stream: true,
        }),
    }
  }

  it('streams serialized run events, answers required actions and keeps streaming the tool output run', async () => {
    const run = fakeRun({ threadId: THREAD_ID, runId: 'run_1' })
    const message = fakeMessage({
      threadId: THREAD_ID,
      text: 'Found it.',
      runId: run.id,
    })
    const { fakeOpenai, client, createRunStream } = await startAssistantsApi({
      runEvents: [
        { event: 'thread.run.created', data: { ...run, status: 'queued' } },
        { event: 'thread.run.in_progress', data: run },
        { event: 'thread.run.step.created', data: runStep({ runId: run.id }) },
        {
          event: 'thread.run.step.delta',
          data: {
            id: 'step_1',
            object: 'thread.run.step.delta',
            delta: { step_details: { type: 'tool_calls', tool_calls: [] } },
          },
        },
        {
          event: 'thread.run.requires_action',
          data: {
            ...run,
            status: 'requires_action',
            required_action: requiredAction,
          },
        },
      ],
      toolOutputEvents: [
        {
          event: 'thread.run.step.completed',
          data: runStep({ runId: run.id, status: 'completed' }),
        },
        {
          event: 'thread.message.created',
          data: { ...message, status: 'in_progress', content: [] },
        },
        {
          event: 'thread.message.in_progress',
          data: { ...message, status: 'in_progress', content: [] },
        },
        {
          event: 'thread.message.delta',
          data: {
            id: message.id,
            object: 'thread.message.delta',
            delta: {
              content: [
                { index: 0, type: 'text', text: { value: 'Found it.' } },
              ],
            },
          },
        },
        { event: 'thread.message.completed', data: message },
        {
          event: 'thread.run.completed',
          data: { ...run, status: 'completed' },
        },
      ],
    })

    const handleToolCall = vi.fn(async ({ toolCall }) => ({
      tool_call_id: toolCall.id,
      output: 'found',
    }))
    const onStart = vi.fn()
    const onEvent = vi.fn()
    const onClose = vi.fn()
    const onError = vi.fn()

    const events = await readMessageEvents({
      response: new Response(
        createMessageResponse({
          client,
          createRunStream: await createRunStream(),
          handleToolCall,
          onStart,
          onEvent,
          onClose,
          onError,
        }),
      ),
    })

    expect(events.map(({ event }) => event)).toEqual([
      'thread.run.created',
      'thread.run.step.created',
      'thread.run.step.delta',
      'thread.run.requires_action',
      'thread.run.step.completed',
      'thread.message.created',
      'thread.message.in_progress',
      'thread.message.delta',
      'thread.message.completed',
    ])
    // Runs, steps and messages are trimmed to what the client renders.
    expect(events[0].data).toEqual({
      id: run.id,
      thread_id: THREAD_ID,
      assistant_id: 'asst_fake',
      created_at: run.created_at,
    })
    expect(Object.keys(events[1].data).sort()).toEqual([
      'cancelled_at',
      'completed_at',
      'failed_at',
      'id',
      'run_id',
      'status',
      'step_details',
    ])
    expect(events[8].data).toEqual({
      id: message.id,
      role: 'assistant',
      created_at: message.created_at,
      content: message.content,
      run_id: run.id,
      assistant_id: 'asst_fake',
      thread_id: THREAD_ID,
      attachments: [],
      metadata: {},
      runSteps: [],
      status: 'completed',
    })

    // The tool call was answered and its output submitted for the run.
    expect(handleToolCall).toHaveBeenCalledWith(
      expect.objectContaining({
        toolCall: requiredAction.submit_tool_outputs.tool_calls[0],
        run: expect.objectContaining({ id: run.id }),
      }),
    )
    const [submission] = fakeOpenai.find({
      method: 'POST',
      path: `/threads/${THREAD_ID}/runs/${run.id}/submit_tool_outputs`,
    })
    expect(submission.body).toMatchObject({
      tool_outputs: [{ tool_call_id: 'call_1', output: 'found' }],
      stream: true,
    })

    // Every provider event is reported, also those not sent to the client.
    expect(onEvent.mock.calls.map(([{ event }]) => event)).toContain(
      'thread.run.completed',
    )
    expect(onEvent).toHaveBeenCalledTimes(11)
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
  })

  it('forwards a failed run', async () => {
    const run = fakeRun({ threadId: THREAD_ID })
    const { client, createRunStream } = await startAssistantsApi({
      runEvents: [
        { event: 'thread.run.created', data: run },
        {
          event: 'thread.run.failed',
          data: {
            ...run,
            status: 'failed',
            last_error: { code: 'server_error', message: 'Boom' },
          },
        },
      ],
    })

    const events = await readMessageEvents({
      response: new Response(
        createMessageResponse({
          client,
          createRunStream: await createRunStream(),
          handleToolCall: vi.fn(),
        }),
      ),
    })

    expect(events).toEqual([
      {
        event: 'thread.run.created',
        data: expect.objectContaining({ id: run.id }),
      },
      {
        event: 'thread.run.failed',
        data: {
          id: run.id,
          thread_id: THREAD_ID,
          assistant_id: 'asst_fake',
          created_at: run.created_at,
        },
      },
    ])
  })

  it('errors the stream when a run requires an action it does not describe', async () => {
    const run = fakeRun({ threadId: THREAD_ID })
    const { client, createRunStream } = await startAssistantsApi({
      runEvents: [
        {
          event: 'thread.run.requires_action',
          data: { ...run, status: 'requires_action', required_action: null },
        },
      ],
    })
    const handleToolCall = vi.fn()

    // Without callbacks, as the server's ASSISTANT function handler calls it.
    const response = new Response(
      createMessageResponse({
        client,
        createRunStream: await createRunStream(),
        handleToolCall,
      }),
    )

    await expect(readMessageEvents({ response })).rejects.toThrow(
      'Run does not have a required action',
    )
    expect(handleToolCall).not.toHaveBeenCalled()
  })

  it('skips Azure keepalive events with empty data', async () => {
    const run = fakeRun({ threadId: THREAD_ID })
    const message = fakeMessage({ threadId: THREAD_ID, text: 'After' })
    const sse = [
      `event: thread.run.created\ndata: ${JSON.stringify(run)}\n\n`,
      'event: thread.run.in_progress\ndata: \n\n',
      `event: thread.message.completed\ndata: ${JSON.stringify(message)}\n\n`,
      'event: done\ndata: [DONE]\n\n',
    ].join('')
    const fakeOpenai = await startFakeOpenai({
      handle: () => ({
        type: 'raw',
        body: sse,
        headers: { 'content-type': 'text/event-stream' },
      }),
    })
    cleanups.push(fakeOpenai.close)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    cleanups.push(() => vi.restoreAllMocks())
    const client = new OpenAI({
      apiKey: 'sk-test',
      baseURL: fakeOpenai.baseURL,
      maxRetries: 0,
    })
    const onError = vi.fn()

    const events = await readMessageEvents({
      response: new Response(
        createMessageResponse({
          client,
          createRunStream: await client.beta.threads.runs.create(THREAD_ID, {
            assistant_id: 'asst_fake',
            stream: true,
          }),
          handleToolCall: vi.fn(),
          onError,
        }),
      ),
    })

    expect(onError).not.toHaveBeenCalled()
    // BUG: the OpenAI SDK's stream is an async generator, so once parsing the
    // empty keepalive throws, the generator is finished. safeStreamIterator
    // swallows the error and asks for the next event, gets `done`, and the
    // response ends as if the run were over: every event after the keepalive
    // (here the completed message) is silently dropped.
    expect(events.map(({ event }) => event)).toEqual(['thread.run.created'])
  })

  it('rethrows run stream errors that are not keepalives, whatever was thrown', async () => {
    const throwingStream = ({ thrown }: { thrown: unknown }) => ({
      [Symbol.asyncIterator]: () => ({
        next: () => Promise.reject(thrown),
      }),
    })

    for (const thrown of [
      null,
      'socket hang up',
      new Error('Connection error.', { cause: new Error('ECONNRESET') }),
    ]) {
      const onError = vi.fn()
      const response = new Response(
        createMessageResponse({
          client: {},
          createRunStream: throwingStream({ thrown }),
          handleToolCall: vi.fn(),
          onError,
        }),
      )

      await expect(readMessageEvents({ response })).rejects.toBe(thrown)
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ error: thrown }),
      )
    }
  })

  it('BUG: closes the stream after erroring it, so a piped HTTP response never ends', async () => {
    const run = fakeRun({ threadId: THREAD_ID })
    // The provider connection drops shortly after the run starts.
    const { client, createRunStream } = await startAssistantsApi({
      runEvents: [{ event: 'thread.run.created', data: run }],
      waitFor: new Promise((resolve) => setTimeout(resolve, 200)),
      finish: 'destroy',
    })
    const onError = vi.fn()
    const closes: { desiredSize: number | null; closeError: unknown }[] = []

    const server = createServer(async (_req, res) => {
      const stream = createMessageResponse({
        client,
        createRunStream: await createRunStream(),
        handleToolCall: vi.fn(),
        onError,
        onClose: ({ controller }) => {
          let closeError: unknown = null
          try {
            controller.close()
          } catch (error) {
            closeError = error
          }
          closes.push({ desiredSize: controller.desiredSize, closeError })
        },
      })
      res.writeHead(200, { 'content-type': 'application/json' })
      Readable.fromWeb(stream as never)
        .on('error', () => {})
        .pipe(res)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    cleanups.push(
      () =>
        new Promise<void>((resolve) => {
          server.closeAllConnections()
          server.close(() => resolve())
        }),
    )
    const { port } = server.address() as AddressInfo

    const response = await fetch(`http://127.0.0.1:${port}`)
    const reader = response.body!.getReader()
    const firstChunk = await reader.read()
    expect(new TextDecoder().decode(firstChunk.value)).toContain(
      '"event":"thread.run.created"',
    )

    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
    // BUG: after controller.error(), createMessageResponse still runs onClose
    // and controller.close() on the errored stream; close throws "Invalid
    // state" and no end of stream is ever produced. Piped into a Node HTTP
    // response (e.g. `Readable.fromWeb(stream).pipe(res)`), the response is
    // left open: the client neither gets more data nor the end.
    expect(closes).toEqual([
      {
        desiredSize: null,
        closeError: expect.objectContaining({ code: 'ERR_INVALID_STATE' }),
      },
    ])
    const next = await Promise.race([
      reader.read().then(() => 'ended'),
      new Promise((resolve) => setTimeout(() => resolve('hanging'), 1_000)),
    ])
    expect(next).toBe('hanging')
    await reader.cancel()
  })
})
