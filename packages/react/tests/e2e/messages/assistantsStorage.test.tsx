import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { useQueryClient } from '@tanstack/react-query'
import Cookies from 'js-cookie'
import {
  CheckCircledIcon,
  CircleBackslashIcon,
  CircleIcon,
} from '@radix-ui/react-icons'
import { Thread } from '@/components/threads/Thread'
import { Suggestions } from '@/components/suggestions/Suggestions'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import type { MessagesPage } from '@/types'
import { useLatestAssistantMessageWithContent } from '@/hooks/messages/useLatestAssistantMessageWithContent'
import { key } from '@/lib/threadIdStorage/key'
import { enqueueJson } from '@/lib/streams/enqueueJson'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { sendThreadMessage } from '../lib/sendThreadMessage'
import { startAssistantsApiServer } from '../lib/startAssistantsApiServer'
import { threadIdCookie } from '../lib/threadIdCookie'
import { SendPreparedMessage } from '../lib/SendPreparedMessage'
import { CachedMessages } from '../lib/CachedMessages'

// The e2e server's cloud storage streams a fixed subset of Assistants API
// events. These tests run the Thread against an assistant on OpenAI
// Assistants storage instead: the server helpers this package exports
// stream scripted Assistants API runs, so message in_progress events, partial
// deltas, code interpreter and file search steps reach the client as they
// would from OpenAI.

const TIMEOUT = { timeout: 15_000 }
const PLACEHOLDER = 'Message Scripted...'

const run = ({
  threadId,
  id = 'run_1',
}: {
  threadId: string
  id?: string
}) => ({
  id,
  object: 'thread.run',
  created_at: 1,
  thread_id: threadId,
  assistant_id: 'asst_fake',
  status: 'in_progress',
  required_action: null,
  last_error: null,
  model: 'gpt-fake',
  instructions: '',
  tools: [],
  metadata: {},
})

const message = ({
  threadId,
  id,
  role = 'assistant',
  runId = 'run_1',
  content = [],
  createdAt = 2,
}: {
  threadId: string
  id: string
  role?: string
  runId?: string | null
  content?: unknown[]
  createdAt?: number
}) => ({
  id,
  object: 'thread.message',
  created_at: createdAt,
  thread_id: threadId,
  role,
  content,
  run_id: role === 'user' ? null : runId,
  assistant_id: role === 'user' ? null : 'asst_fake',
  attachments: [],
  metadata: {},
  status: 'completed',
})

const text = ({ value }: { value: string }) => ({
  type: 'text',
  text: { value, annotations: [] },
})

const step = ({
  id,
  runId = 'run_1',
  stepDetails,
  status = 'completed',
  completedAt = status === 'completed' ? 3 : null,
  cancelledAt = null,
  failedAt = null,
}: {
  id: string
  runId?: string
  stepDetails: unknown
  status?: string
  completedAt?: number | null
  cancelledAt?: number | null
  failedAt?: number | null
}) => ({
  id,
  object: 'thread.run.step',
  created_at: 1,
  run_id: runId,
  assistant_id: 'asst_fake',
  thread_id: 'thread_1',
  type: 'tool_calls',
  status,
  step_details: stepDetails,
  completed_at: completedAt,
  cancelled_at: cancelledAt,
  failed_at: failedAt,
  expired_at: null,
  last_error: null,
  usage: null,
  metadata: {},
})

const messageDelta = ({ id, delta }: { id: string; delta: unknown }) => ({
  event: 'thread.message.delta',
  data: { id, object: 'thread.message.delta', delta },
})

// OpenAI's step deltas carry no run_id; Superinterface Cloud storage adds it.
const stepDelta = ({
  id,
  runId,
  stepDetails,
}: {
  id: string
  runId?: string
  stepDetails: unknown
}) => ({
  event: 'thread.run.step.delta',
  data: {
    id,
    object: 'thread.run.step.delta',
    ...(runId ? { run_id: runId } : {}),
    delta: { step_details: stepDetails },
  },
})

// Shows, on clicking "Read latest", the content and run steps of the latest
// cached message as JSON, without subscribing to (and so fetching) messages.
const CachedLatestMessage = () => {
  const queryClient = useQueryClient()
  const { variables } = useSuperinterfaceContext()
  const [json, setJson] = useState('')

  const read = () => {
    const data = queryClient.getQueryData<{ pages: MessagesPage[] }>([
      'messages',
      variables,
    ])
    const latest = data?.pages[0].data[0]
    setJson(
      JSON.stringify({
        content: latest?.content,
        runSteps: latest?.runSteps.map(({ id, step_details }) => ({
          id,
          step_details,
        })),
      }),
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={read}
      >
        Read latest
      </button>
      <output data-testid="cached-latest">{json}</output>
    </>
  )
}

const iconMarkup = ({ icon }: { icon: React.ReactElement }) =>
  renderToStaticMarkup(icon)

// The icon a rendered tool call title is shown with.
const titleIcon = ({ title }: { title: HTMLElement }) =>
  title.closest('button')!.querySelector('svg')!.outerHTML

const deferred = () => {
  let resolve: () => void = () => {}
  const promise = new Promise<void>((done) => {
    resolve = done
  })

  return { promise, resolve }
}

describe('Thread on OpenAI Assistants storage', () => {
  const cleanups: (() => Promise<void> | void)[] = []

  afterEach(async () => {
    cleanup()
    for (const fn of cleanups.splice(0)) await fn()
  })

  it('builds the reply from in_progress and partial delta events', async () => {
    const server = await startAssistantsApiServer({
      runEvents: ({ threadId }) => [
        { event: 'thread.run.created', data: run({ threadId }) },
        { event: 'thread.run.in_progress', data: run({ threadId }) },
        {
          event: 'thread.run.step.created',
          data: step({
            id: 'step_message',
            status: 'in_progress',
            stepDetails: {
              type: 'message_creation',
              message_creation: { message_id: 'msg_1' },
            },
          }),
        },
        {
          event: 'thread.message.created',
          data: {
            ...message({ threadId, id: 'msg_1' }),
            status: 'in_progress',
          },
        },
        {
          event: 'thread.message.in_progress',
          data: {
            ...message({ threadId, id: 'msg_1' }),
            status: 'in_progress',
          },
        },
        // A new image part, then the same part again: non-text parts are
        // kept as first streamed.
        messageDelta({
          id: 'msg_1',
          delta: {
            content: [
              {
                index: 0,
                type: 'image_file',
                image_file: { file_id: 'file_a' },
              },
            ],
          },
        }),
        messageDelta({
          id: 'msg_1',
          delta: {
            content: [
              {
                index: 0,
                type: 'image_file',
                image_file: { file_id: 'file_b' },
              },
            ],
          },
        }),
        // Text arrives without annotations, with them, and then without.
        messageDelta({
          id: 'msg_1',
          delta: {
            content: [{ index: 1, type: 'text', text: { value: 'Hello' } }],
          },
        }),
        messageDelta({
          id: 'msg_1',
          delta: {
            content: [
              {
                index: 1,
                type: 'text',
                text: { value: ' world', annotations: [] },
              },
            ],
          },
        }),
        messageDelta({
          id: 'msg_1',
          delta: {
            content: [{ index: 1, type: 'text', text: { value: '!' } }],
          },
        }),
        // Deltas without text or without content change nothing.
        messageDelta({
          id: 'msg_1',
          delta: { content: [{ index: 1, type: 'text' }] },
        }),
        messageDelta({ id: 'msg_1', delta: { role: 'assistant' } }),
        stepDelta({
          id: 'step_message',
          runId: 'run_1',
          stepDetails: {
            type: 'message_creation',
            message_creation: { message_id: 'msg_1' },
          },
        }),
        // The completed message adds a refusal part, which is not shown.
        {
          event: 'thread.message.completed',
          data: message({
            threadId,
            id: 'msg_1',
            content: [
              { type: 'image_file', image_file: { file_id: 'file_a' } },
              text({ value: 'Hello world!' }),
              { type: 'refusal', refusal: 'Not that part.' },
            ],
          }),
        },
      ],
    })
    cleanups.push(server.close)

    // What an app might show next to the thread: the latest assistant
    // message that has text, whatever other parts come first.
    const LatestText = () => {
      const { latestAssistantMessageWithContent } =
        useLatestAssistantMessageWithContent()

      return (
        <output data-testid="latest-text">
          {latestAssistantMessageWithContent?.content
            .map((part) => (part.type === 'text' ? part.text.value : part.type))
            .join('|')}
        </output>
      )
    }

    renderWithSuperinterface({
      baseUrl: server.baseUrl,
      variables: { assistantId: 'asst_stream' },
      children: (
        <>
          <Thread />
          <LatestText />
        </>
      ),
    })
    await sendThreadMessage({ content: 'Show me', placeholder: PLACEHOLDER })

    expect(await screen.findByText('Hello world!', {}, TIMEOUT)).toBeTruthy()
    const image = document.querySelector('img[src*="/files/"]')!
    expect(image.getAttribute('src')).toBe(
      `${server.baseUrl}/files/file_a/contents?assistantId=asst_stream`,
    )
    await waitFor(() =>
      expect(screen.getByTestId('latest-text').textContent).toBe(
        'image_file|Hello world!|refusal',
      ),
    )
    expect(screen.queryByText('Not that part.')).toBeNull()
    expect(threadIdCookie({ assistantId: 'asst_stream' })).toBe('thread_1')
  }, 60_000)

  it('shows each kind of tool call with its status', async () => {
    const threadId = 'thread_history'
    const codeInterpreter = ({ input }: { input: string }) => ({
      type: 'tool_calls',
      tool_calls: [
        {
          id: `call_ci_${input.length}`,
          type: 'code_interpreter',
          code_interpreter: { input, outputs: [{ type: 'logs', logs: '2' }] },
        },
      ],
    })
    const functionCall = {
      type: 'tool_calls',
      tool_calls: [
        {
          id: 'call_fn',
          type: 'function',
          function: { name: 'lookup', arguments: '{}', output: null },
        },
      ],
    }
    const server = await startAssistantsApiServer({
      runEvents: () => [],
      threadMessages: () => [
        message({
          threadId,
          id: 'msg_answer',
          content: [text({ value: 'All done.' })],
        }),
        // OpenAI lists messages without attachments with `attachments: null`.
        {
          ...message({
            threadId,
            id: 'msg_question',
            role: 'user',
            content: [text({ value: 'Use every tool' })],
            createdAt: 1,
          }),
          attachments: null,
        },
      ],
      runSteps: () => [
        step({ id: 's1', stepDetails: codeInterpreter({ input: '1 + 1' }) }),
        step({
          id: 's2',
          status: 'in_progress',
          stepDetails: codeInterpreter({ input: '' }),
        }),
        step({
          id: 's3',
          status: 'failed',
          failedAt: 3,
          stepDetails: {
            type: 'tool_calls',
            tool_calls: [
              { id: 'call_fs', type: 'file_search', file_search: {} },
            ],
          },
        }),
        step({
          id: 's4',
          status: 'cancelled',
          cancelledAt: 3,
          stepDetails: functionCall,
        }),
        step({ id: 's5', status: 'expired', stepDetails: functionCall }),
        step({
          id: 's6',
          status: 'in_progress',
          stepDetails: {
            type: 'tool_calls',
            tool_calls: [{ id: 'call_ws', type: 'web_search', web_search: {} }],
          },
        }),
        step({
          id: 's7',
          status: 'in_progress',
          stepDetails: { type: 'tool_calls', tool_calls: [] },
        }),
      ],
    })
    cleanups.push(server.close)
    // A returning visitor whose cookie points at the thread.
    Cookies.set(key({ assistantId: 'asst_history' }), threadId)

    renderWithSuperinterface({
      baseUrl: server.baseUrl,
      variables: { assistantId: 'asst_history' },
      children: <Thread />,
    })

    expect(await screen.findByText('All done.', {}, TIMEOUT)).toBeTruthy()
    expect(screen.getByText('Use every tool')).toBeTruthy()
    const check = iconMarkup({ icon: <CheckCircledIcon /> })
    const stopped = iconMarkup({ icon: <CircleBackslashIcon /> })
    const running = iconMarkup({ icon: <CircleIcon /> })

    const [ranCode, runningCode] = screen.getAllByText('Using code interpreter')
    expect(titleIcon({ title: ranCode })).toBe(check)
    expect(titleIcon({ title: runningCode })).toBe(running)
    expect(titleIcon({ title: screen.getByText('Searching files') })).toBe(
      stopped,
    )
    expect(titleIcon({ title: screen.getByText('Cancelled lookup') })).toBe(
      stopped,
    )
    // An expired call never finished, but is not running anymore.
    expect(titleIcon({ title: screen.getByText('Calling lookup') })).toBe(
      stopped,
    )
    expect(
      titleIcon({ title: screen.getByText('Using tool: web_search') }),
    ).toBe(running)
    // s7 has no tool calls yet, so it shows a placeholder for the actions
    // being started.
    expect(screen.getAllByText('Starting actions')).toHaveLength(1)

    // The code interpreter's popover shows its code and outputs, once there
    // is code.
    fireEvent.click(ranCode)
    const popover = await screen.findByRole('dialog')
    expect(within(popover).getByText('1 + 1')).toBeTruthy()
    expect(
      within(popover).getByText('[{"type":"logs","logs":"2"}]'),
    ).toBeTruthy()
    fireEvent.keyDown(popover, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(runningCode)
    expect((await screen.findByRole('dialog')).textContent).toBe('')
  }, 60_000)

  it('shows newer run steps below a message when no next message creation step follows it', async () => {
    const threadId = 'thread_after_reply'
    const server = await startAssistantsApiServer({
      threadMessages: () => [
        message({
          threadId,
          id: 'msg_answer',
          content: [text({ value: 'Let me look that up.' })],
        }),
        message({
          threadId,
          id: 'msg_question',
          role: 'user',
          content: [text({ value: 'What is new?' })],
          createdAt: 1,
        }),
      ],
      // Newest first: the assistant wrote its message, then called a tool.
      // No message creation step is newer than msg_answer's, so the steps
      // from the run's newest (index 0) up to it belong below msg_answer.
      runSteps: () => [
        step({
          id: 'step_tool',
          status: 'in_progress',
          stepDetails: {
            type: 'tool_calls',
            tool_calls: [
              {
                id: 'call_news',
                type: 'function',
                function: { name: 'news', arguments: '{}', output: null },
              },
            ],
          },
        }),
        step({
          id: 'step_message',
          stepDetails: {
            type: 'message_creation',
            message_creation: { message_id: 'msg_answer' },
          },
        }),
      ],
    })
    cleanups.push(server.close)
    Cookies.set(key({ assistantId: 'asst_after_reply' }), threadId)

    renderWithSuperinterface({
      baseUrl: server.baseUrl,
      variables: { assistantId: 'asst_after_reply' },
      children: <Thread />,
    })

    const reply = await screen.findByText('Let me look that up.', {}, TIMEOUT)
    const call = screen.getByText('Calling news')
    expect(screen.getAllByText('Calling news')).toHaveLength(1)
    // The message renders older steps, its content, then later steps: the
    // tool call is the only later step, and nothing is older.
    const messageBox = reply.closest('[style*="word-break"]')!
      .parentElement as HTMLElement
    const [olderSteps, content, laterSteps] = Array.from(messageBox.children)
    expect(olderSteps.textContent).toBe('')
    expect(content.textContent).toBe('Let me look that up.')
    expect(laterSteps.contains(call)).toBe(true)
    expect(laterSteps.textContent).toBe('Calling news')
  }, 60_000)

  it('streams tool call steps until the tool outputs are submitted', async () => {
    const toolCall = deferred()
    const toolCallStarted = deferred()
    const toolCalls = [
      {
        id: 'call_ci',
        type: 'code_interpreter',
        code_interpreter: { input: '', outputs: [] },
      },
    ]
    const server = await startAssistantsApiServer({
      runEvents: ({ threadId }) => [
        { event: 'thread.run.created', data: run({ threadId }) },
        {
          event: 'thread.run.step.created',
          data: step({
            id: 'step_tools',
            status: 'in_progress',
            stepDetails: { type: 'tool_calls', tool_calls: toolCalls },
          }),
        },
        stepDelta({
          id: 'step_tools',
          runId: 'run_1',
          stepDetails: {
            type: 'tool_calls',
            tool_calls: [
              {
                index: 0,
                type: 'code_interpreter',
                code_interpreter: { input: 'x = 1' },
              },
            ],
          },
        }),
        stepDelta({
          id: 'step_tools',
          runId: 'run_1',
          stepDetails: { type: 'tool_calls' },
        }),
        stepDelta({
          id: 'step_tools',
          runId: 'run_1',
          stepDetails: {
            type: 'tool_calls',
            tool_calls: [
              {
                index: 1,
                id: 'call_fn',
                type: 'function',
                function: { name: 'lookup', arguments: '' },
              },
            ],
          },
        }),
        stepDelta({
          id: 'step_tools',
          runId: 'run_1',
          stepDetails: {
            type: 'tool_calls',
            tool_calls: [
              { index: 1, type: 'function', function: { arguments: '{"q":' } },
            ],
          },
        }),
        // Deltas with nothing to add leave the call as it is.
        stepDelta({
          id: 'step_tools',
          runId: 'run_1',
          stepDetails: {
            type: 'tool_calls',
            tool_calls: [{ index: 1, type: 'function' }],
          },
        }),
        stepDelta({
          id: 'step_tools',
          runId: 'run_1',
          stepDetails: {
            type: 'tool_calls',
            tool_calls: [{ index: 1, type: 'function', function: {} }],
          },
        }),
        {
          event: 'thread.run.step.delta',
          data: {
            id: 'step_tools',
            run_id: 'run_1',
            object: 'thread.run.step.delta',
            delta: {},
          },
        },
        stepDelta({
          id: 'step_tools',
          runId: 'run_1',
          stepDetails: {
            type: 'tool_calls',
            tool_calls: [
              { index: 1, type: 'function', function: { arguments: '1}' } },
            ],
          },
        }),
        // Shaped as OpenAI streams it: without the run's id.
        stepDelta({
          id: 'step_tools',
          stepDetails: {
            type: 'tool_calls',
            tool_calls: [
              {
                index: 2,
                id: 'call_other',
                type: 'function',
                function: { name: 'other_lookup', arguments: '{}' },
              },
            ],
          },
        }),
        {
          event: 'thread.run.requires_action',
          data: {
            ...run({ threadId }),
            status: 'requires_action',
            required_action: {
              type: 'submit_tool_outputs',
              submit_tool_outputs: {
                tool_calls: [
                  {
                    id: 'call_fn',
                    type: 'function',
                    function: { name: 'lookup', arguments: '{"q":1}' },
                  },
                ],
              },
            },
          },
        },
      ],
      handleToolCall: async ({ toolCall: call }) => {
        toolCallStarted.resolve()
        await toolCall.promise

        return { tool_call_id: call.id, output: '{"answer":42}' }
      },
      toolOutputEvents: ({ threadId }) => [
        {
          event: 'thread.run.step.completed',
          data: step({
            id: 'step_tools',
            stepDetails: {
              type: 'tool_calls',
              tool_calls: [
                {
                  id: 'call_ci',
                  type: 'code_interpreter',
                  code_interpreter: { input: 'x = 1', outputs: [] },
                },
                {
                  id: 'call_fn',
                  type: 'function',
                  function: {
                    name: 'lookup',
                    arguments: '{"q":1}',
                    output: '{"answer":42}',
                  },
                },
              ],
            },
          }),
        },
        {
          event: 'thread.message.created',
          data: message({ threadId, id: 'msg_final' }),
        },
        messageDelta({
          id: 'msg_final',
          delta: {
            content: [{ index: 0, type: 'text', text: { value: 'It is 42.' } }],
          },
        }),
        {
          event: 'thread.message.completed',
          data: message({
            threadId,
            id: 'msg_final',
            content: [text({ value: 'It is 42.' })],
          }),
        },
        {
          event: 'thread.run.completed',
          data: { ...run({ threadId }), status: 'completed' },
        },
      ],
    })
    cleanups.push(server.close, toolCall.resolve)

    renderWithSuperinterface({
      baseUrl: server.baseUrl,
      variables: { assistantId: 'asst_tools' },
      children: <Thread />,
    })
    await sendThreadMessage({ content: 'Compute', placeholder: PLACEHOLDER })
    await toolCallStarted.promise

    // The function call was assembled from its argument deltas.
    fireEvent.click(await screen.findByText('Calling lookup', {}, TIMEOUT))
    // BUG: threadRunStepDelta matches deltas to messages by `data.run_id`,
    // which OpenAI's thread.run.step.delta events do not have, so on OpenAI
    // Assistants storage every streamed tool call delta is dropped (here the
    // other_lookup call) until the step completes.
    expect(screen.queryByText('Calling other_lookup')).toBeNull()
    expect((await screen.findByRole('dialog')).textContent).toContain('"q": 1')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // BUG: only function deltas are merged into tool calls; the code
    // interpreter's streamed input ("x = 1") is dropped, so its popover stays
    // empty until the step completes.
    fireEvent.click(screen.getByText('Using code interpreter'))
    expect((await screen.findByRole('dialog')).textContent).toBe('')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    toolCall.resolve()
    expect(await screen.findByText('It is 42.', {}, TIMEOUT)).toBeTruthy()
    fireEvent.click(await screen.findByText('Finished lookup', {}, TIMEOUT))
    expect((await screen.findByRole('dialog')).textContent).toContain(
      '"answer": 42',
    )
  }, 60_000)

  it('answers client tool calls of unsupported types with an error', async () => {
    const server = await startAssistantsApiServer({
      runEvents: ({ threadId }) => [
        { event: 'thread.run.created', data: run({ threadId }) },
        {
          event: 'thread.run.requires_action',
          data: {
            ...run({ threadId }),
            status: 'requires_action',
            required_action: {
              type: 'submit_tool_outputs',
              submit_tool_outputs: {
                tool_calls: [
                  {
                    id: 'call_client',
                    type: 'function',
                    function: { name: 'client', arguments: '{}' },
                  },
                ],
              },
            },
          },
        },
      ],
      // The server asks the client to run a tool that is not a function.
      handleToolCall: ({ toolCall, run: currentRun, controller }) => {
        enqueueJson({
          controller,
          value: {
            event: 'thread.run.requires_action',
            data: {
              ...currentRun,
              required_action: {
                type: 'submit_client_tool_outputs',
                submit_client_tool_outputs: {
                  tool_calls: [{ id: toolCall.id, type: 'code_interpreter' }],
                },
              },
            },
          },
        })

        return { tool_call_id: toolCall.id, output: 'asked the client' }
      },
    })
    cleanups.push(server.close)

    renderWithSuperinterface({
      baseUrl: server.baseUrl,
      variables: { assistantId: 'asst_client', publicApiKey: 'public_1' },
      children: <Thread />,
    })
    await sendThreadMessage({ content: 'Run it', placeholder: PLACEHOLDER })

    await waitFor(
      () =>
        expect(server.clientToolOutputs).toEqual([
          {
            toolOutputs: [
              {
                toolCallId: 'call_client',
                output:
                  'Error: client tool type code_interpreter is not supported.',
              },
            ],
            assistantId: 'asst_client',
            publicApiKey: 'public_1',
          },
        ]),
      TIMEOUT,
    )
    await waitFor(
      () =>
        expect(
          document.querySelector('form button[type="submit"]'),
        ).not.toBeNull(),
      TIMEOUT,
    )
  }, 60_000)

  it('streams a tool run into an empty cache when only createMessage is used', async () => {
    const functionCall = ({ output }: { output: string | null }) => ({
      type: 'tool_calls',
      tool_calls: [
        {
          id: 'call_fn',
          type: 'function',
          function: { name: 'lookup', arguments: '{}', output },
        },
      ],
    })
    const server = await startAssistantsApiServer({
      // Assistants API runs announce their tool steps before any message.
      runEvents: ({ threadId }) => [
        { event: 'thread.run.created', data: run({ threadId }) },
        {
          event: 'thread.run.step.created',
          data: step({
            id: 'step_tools',
            status: 'in_progress',
            stepDetails: functionCall({ output: null }),
          }),
        },
        stepDelta({
          id: 'step_tools',
          runId: 'run_1',
          stepDetails: {
            type: 'tool_calls',
            tool_calls: [
              { index: 0, type: 'function', function: { arguments: '' } },
            ],
          },
        }),
        {
          event: 'thread.run.requires_action',
          data: {
            ...run({ threadId }),
            status: 'requires_action',
            required_action: {
              type: 'submit_tool_outputs',
              submit_tool_outputs: {
                tool_calls: [
                  {
                    id: 'call_fn',
                    type: 'function',
                    function: { name: 'lookup', arguments: '{}' },
                  },
                ],
              },
            },
          },
        },
      ],
      toolOutputEvents: ({ threadId }) => [
        {
          event: 'thread.run.step.completed',
          data: step({
            id: 'step_tools',
            stepDetails: functionCall({ output: '1' }),
          }),
        },
        {
          event: 'thread.message.created',
          data: message({ threadId, id: 'msg_final' }),
        },
        messageDelta({
          id: 'msg_final',
          delta: {
            content: [
              { index: 0, type: 'text', text: { value: 'Looked up.' } },
            ],
          },
        }),
        {
          event: 'thread.message.completed',
          data: message({
            threadId,
            id: 'msg_final',
            content: [text({ value: 'Looked up.' })],
          }),
        },
        {
          event: 'thread.run.completed',
          data: { ...run({ threadId }), status: 'completed' },
        },
      ],
    })
    cleanups.push(server.close)

    // No message list is mounted, and the extra variable keeps the
    // optimistic message out of the key the stream writes to.
    renderWithSuperinterface({
      baseUrl: server.baseUrl,
      variables: { assistantId: 'asst_headless' },
      children: (
        <>
          <SendPreparedMessage
            variables={{ content: 'Look it up', source: 'widget' }}
          />
          <CachedMessages />
        </>
      ),
    })
    fireEvent.click(await screen.findByText('Send prepared', {}, TIMEOUT))

    expect(
      await screen.findByText('Send result: sent', {}, TIMEOUT),
    ).toBeTruthy()
    expect(server.messagePosts).toEqual([
      { assistantId: 'asst_headless', content: 'Look it up', source: 'widget' },
    ])
    // Events before the first message had no cache to update; the message
    // events then built it from scratch.
    fireEvent.click(screen.getByText('Read cache'))
    expect(screen.getByTestId('cached-messages').textContent).toBe(
      'assistant: Looked up.',
    )
  }, 60_000)

  it('copes with the app dropping cached messages mid-run', async () => {
    // Each run pauses after creating its message; meanwhile the app drops
    // its cached messages (e.g. on sign out), then the run continues with
    // `afterPause` message events.
    let paused = deferred()
    let resume = deferred()
    let afterPause: string[] = []
    const server = await startAssistantsApiServer({
      runStream: async function* ({ threadId }) {
        yield { event: 'thread.run.created', data: run({ threadId }) }
        yield {
          event: 'thread.message.created',
          data: message({ threadId, id: 'msg_1' }),
        }
        paused.resolve()
        await resume.promise

        for (const name of afterPause) {
          yield name === 'delta'
            ? messageDelta({
                id: 'msg_1',
                delta: {
                  content: [{ index: 0, type: 'text', text: { value: 'Hi' } }],
                },
              })
            : {
                event: `thread.message.${name}`,
                data: message({
                  threadId,
                  id: 'msg_1',
                  content: [text({ value: 'Hi' })],
                }),
              }
        }
      },
    })
    cleanups.push(server.close, () => resume.resolve())

    const DropMessages = () => {
      const queryClient = useQueryClient()

      return (
        <button
          type="button"
          onClick={() => queryClient.removeQueries({ queryKey: ['messages'] })}
        >
          Drop messages
        </button>
      )
    }

    const sendWithDrop = async ({ names }: { names: string[] }) => {
      afterPause = names
      paused = deferred()
      resume = deferred()
      renderWithSuperinterface({
        baseUrl: server.baseUrl,
        variables: { assistantId: 'asst_drop', threadId: 'thread_drop' },
        children: (
          <>
            <SendPreparedMessage variables={{ content: names.join(' ') }} />
            <DropMessages />
            <CachedMessages />
          </>
        ),
      })
      fireEvent.click(await screen.findByText('Send prepared', {}, TIMEOUT))
      await paused.promise
      // Wait until the created message reached the client's cache.
      await waitFor(() => {
        fireEvent.click(screen.getByText('Read cache'))
        expect(screen.getByTestId('cached-messages').textContent).toContain(
          'assistant: ',
        )
      }, TIMEOUT)
      fireEvent.click(screen.getByText('Drop messages'))
      resume.resolve()
      await waitFor(
        () =>
          expect(screen.getByText(/^Send result:/).textContent).not.toBe(
            'Send result: ',
          ),
        TIMEOUT,
      )
      fireEvent.click(screen.getByText('Read cache'))
      const result = {
        sendResult: screen.getByText(/^Send result:/).textContent,
        cached: screen.getByTestId('cached-messages').textContent,
      }
      cleanup()

      return result
    }

    // The in_progress and completed events start an empty cache, without
    // their message.
    expect(await sendWithDrop({ names: ['in_progress'] })).toEqual({
      sendResult: 'Send result: sent',
      cached: '',
    })
    expect(await sendWithDrop({ names: ['completed'] })).toEqual({
      sendResult: 'Send result: sent',
      cached: '',
    })
    // BUG: a delta also starts an empty cache, and the next delta then reads
    // `.content` of the missing latest message and throws, failing the send.
    expect(await sendWithDrop({ names: ['delta', 'delta'] })).toEqual({
      sendResult:
        "Send result: Cannot read properties of undefined (reading 'content')",
      cached: '',
    })
  }, 60_000)

  it('only stores new threads announced with their assistant and thread ids', async () => {
    const metadatas = [
      undefined,
      {},
      { assistantId: 'asst_meta_3' },
      { threadId: 'thread_4', assistantId: 'asst_meta_4' },
    ]
    let threadMetadataIndex = 0
    const server = await startAssistantsApiServer({
      runEvents: () => [],
      threadMetadata: () => metadatas[threadMetadataIndex++] as never,
    })
    cleanups.push(server.close)

    for (const index of [1, 2, 3, 4]) {
      renderWithSuperinterface({
        baseUrl: server.baseUrl,
        variables: { assistantId: `asst_meta_${index}` },
        children: <Thread />,
      })
      await sendThreadMessage({
        content: `Hi ${index}`,
        placeholder: PLACEHOLDER,
      })
      await waitFor(
        () => expect(server.messagePosts).toHaveLength(index),
        TIMEOUT,
      )
      await waitFor(
        () =>
          expect(
            document.querySelector('form button[type="submit"]'),
          ).not.toBeNull(),
        TIMEOUT,
      )
      cleanup()
    }

    expect(
      [1, 2, 3, 4].map((index) =>
        threadIdCookie({ assistantId: `asst_meta_${index}` }),
      ),
    ).toEqual([null, null, null, 'thread_4'])
  }, 60_000)

  it('merges deltas only into the parts and tool calls they fit', async () => {
    const lookup = {
      id: 'call_fn',
      type: 'function',
      function: { name: 'lookup', arguments: '{}' },
    }
    const toolCalls = [
      {
        id: 'call_ci',
        type: 'code_interpreter',
        code_interpreter: { input: '', outputs: [] },
      },
      // A function call the provider announced without its function.
      { id: 'call_bare', type: 'function' },
      lookup,
    ]
    const functionDelta = ({
      id,
      index,
      fn = { arguments: '{}' },
    }: {
      id: string
      index: number
      fn?: Record<string, string>
    }) =>
      stepDelta({
        id,
        runId: 'run_1',
        stepDetails: {
          type: 'tool_calls',
          tool_calls: [{ index, type: 'function', function: fn }],
        },
      })
    const server = await startAssistantsApiServer({
      runEvents: ({ threadId }) => [
        { event: 'thread.run.created', data: run({ threadId }) },
        {
          event: 'thread.run.step.created',
          data: step({
            id: 'step_tools',
            status: 'in_progress',
            stepDetails: { type: 'tool_calls', tool_calls: toolCalls },
          }),
        },
        // A step without details.
        {
          event: 'thread.run.step.created',
          data: step({
            id: 'step_bare',
            status: 'in_progress',
            stepDetails: null,
          }),
        },
        // Function deltas for the code interpreter call, the call without a
        // function and the step without details.
        functionDelta({ id: 'step_tools', index: 0 }),
        functionDelta({ id: 'step_tools', index: 1 }),
        functionDelta({ id: 'step_bare', index: 0 }),
        // The function call's output, streamed as the server does.
        functionDelta({ id: 'step_tools', index: 2, fn: { output: '42' } }),
        // A step delta without a delta.
        {
          event: 'thread.run.step.delta',
          data: {
            id: 'step_tools',
            run_id: 'run_1',
            object: 'thread.run.step.delta',
          },
        },
        {
          event: 'thread.message.created',
          data: {
            ...message({
              threadId,
              id: 'msg_1',
              content: [
                { type: 'image_file', image_file: { file_id: 'file_a' } },
              ],
            }),
            status: 'in_progress',
          },
        },
        // Text for the image part, then a text part without text, and text
        // for it.
        messageDelta({
          id: 'msg_1',
          delta: {
            content: [{ index: 0, type: 'text', text: { value: 'Not here' } }],
          },
        }),
        messageDelta({
          id: 'msg_1',
          delta: { content: [{ index: 1, type: 'text' }] },
        }),
        messageDelta({
          id: 'msg_1',
          delta: {
            content: [{ index: 1, type: 'text', text: { value: 'Lost' } }],
          },
        }),
      ],
    })
    cleanups.push(server.close)

    // An app's own UI, reading the cache instead of rendering the thread.
    renderWithSuperinterface({
      baseUrl: server.baseUrl,
      variables: { assistantId: 'asst_malformed' },
      children: (
        <>
          <SendPreparedMessage variables={{ content: 'Go' }} />
          <CachedLatestMessage />
        </>
      ),
    })
    fireEvent.click(await screen.findByText('Send prepared', {}, TIMEOUT))

    expect(
      await screen.findByText('Send result: sent', {}, TIMEOUT),
    ).toBeTruthy()
    fireEvent.click(screen.getByText('Read latest'))
    expect(
      JSON.parse(screen.getByTestId('cached-latest').textContent!),
    ).toEqual({
      content: [
        { type: 'image_file', image_file: { file_id: 'file_a' } },
        { type: 'text' },
      ],
      runSteps: [
        { id: 'step_bare', step_details: null },
        {
          id: 'step_tools',
          step_details: {
            type: 'tool_calls',
            tool_calls: [
              toolCalls[0],
              toolCalls[1],
              { ...lookup, function: { ...lookup.function, output: '42' } },
            ],
          },
        },
      ],
    })
  }, 60_000)

  it('logs and skips events the client has no handler for', async () => {
    const server = await startAssistantsApiServer({
      runEvents: ({ threadId }) => [
        { event: 'thread.run.created', data: run({ threadId }) },
        {
          event: 'thread.message.created',
          data: message({ threadId, id: 'msg_1' }),
        },
        {
          event: 'thread.message.completed',
          data: message({
            threadId,
            id: 'msg_1',
            content: [text({ value: 'All finished.' })],
          }),
        },
        {
          event: 'thread.run.completed',
          data: { ...run({ threadId }), status: 'completed' },
        },
      ],
      // A custom server streaming the run's completion too.
      onEvent: ({ controller, event, data }) => {
        if (event !== 'thread.run.completed') return

        enqueueJson({ controller, value: { event, data } })
      },
    })
    cleanups.push(server.close)
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    cleanups.push(() => log.mockRestore())

    renderWithSuperinterface({
      baseUrl: server.baseUrl,
      variables: { assistantId: 'asst_unhandled' },
      children: <Thread />,
    })
    await sendThreadMessage({ content: 'Finish', placeholder: PLACEHOLDER })

    expect(await screen.findByText('All finished.', {}, TIMEOUT)).toBeTruthy()
    await waitFor(
      () =>
        expect(
          document.querySelector('form button[type="submit"]'),
        ).not.toBeNull(),
      TIMEOUT,
    )
    expect(log).toHaveBeenCalledWith('Missing handler', {
      value: expect.objectContaining({
        value: expect.objectContaining({
          event: 'thread.run.completed',
          data: expect.objectContaining({ id: 'run_1', status: 'completed' }),
        }),
      }),
    })
  }, 60_000)

  it('shows function outputs the provider stored as JSON values', async () => {
    const threadId = 'thread_json_output'
    const server = await startAssistantsApiServer({
      threadMessages: () => [
        message({
          threadId,
          id: 'msg_answer',
          content: [text({ value: 'Looked it up.' })],
        }),
      ],
      runSteps: () => [
        step({
          id: 's1',
          stepDetails: {
            type: 'tool_calls',
            tool_calls: [
              {
                id: 'call_fn',
                type: 'function',
                function: {
                  name: 'lookup',
                  arguments: '{"q":1}',
                  output: { answer: 42 },
                },
              },
            ],
          },
        }),
      ],
    })
    cleanups.push(server.close)
    Cookies.set(key({ assistantId: 'asst_json_output' }), threadId)

    renderWithSuperinterface({
      baseUrl: server.baseUrl,
      variables: { assistantId: 'asst_json_output' },
      children: <Thread />,
    })

    fireEvent.click(await screen.findByText('Finished lookup', {}, TIMEOUT))
    expect((await screen.findByRole('dialog')).textContent).toBe(
      `${JSON.stringify({ q: 1 }, null, 2)}${JSON.stringify({ answer: 42 }, null, 2)}`,
    )
  }, 60_000)

  it('starts the reply once the provider has the user message in progress', async () => {
    let paused = deferred()
    let resume = deferred()
    const pause = async () => {
      paused.resolve()
      await resume.promise
      paused = deferred()
      resume = deferred()
    }
    const server = await startAssistantsApiServer({
      runStream: async function* ({ threadId }) {
        await pause()
        // Some providers stream the user message they add to the thread.
        yield {
          event: 'thread.message.created',
          data: {
            ...message({
              threadId,
              id: 'msg_user',
              role: 'user',
              content: [text({ value: 'Are you there?' })],
            }),
            status: 'in_progress',
          },
        }
        await pause()
        yield { event: 'thread.run.created', data: run({ threadId }) }
        yield {
          event: 'thread.message.created',
          data: message({ threadId, id: 'msg_reply' }),
        }
        yield {
          event: 'thread.message.completed',
          data: message({
            threadId,
            id: 'msg_reply',
            content: [text({ value: 'I am here.' })],
          }),
        }
      },
    })
    cleanups.push(server.close, () => resume.resolve())

    const { container } = renderWithSuperinterface({
      baseUrl: server.baseUrl,
      variables: { assistantId: 'asst_user_progress' },
      children: <Thread />,
    })
    await sendThreadMessage({
      content: 'Are you there?',
      placeholder: PLACEHOLDER,
    })

    // While only the app has the message, the assistant is starting.
    await paused.promise
    expect(await screen.findByText('Scripted', {}, TIMEOUT)).toBeTruthy()
    expect(container.querySelectorAll('.rt-Skeleton')).toHaveLength(1)

    // Once the provider has it, the reply's content is starting.
    resume.resolve()
    await paused.promise
    await waitFor(() => expect(screen.queryByText('Scripted')).toBeNull())
    expect(screen.getAllByText('Are you there?')).toHaveLength(1)
    expect(container.querySelectorAll('.rt-Skeleton')).toHaveLength(1)

    resume.resolve()
    expect(await screen.findByText('I am here.', {}, TIMEOUT)).toBeTruthy()
  }, 60_000)

  it('shows suggestions after a message without metadata', async () => {
    const threadId = 'thread_no_metadata'
    const server = await startAssistantsApiServer({
      threadMessages: () => [
        {
          ...message({
            threadId,
            id: 'msg_answer',
            content: [text({ value: 'Anything else?' })],
          }),
          metadata: null,
        },
      ],
    })
    cleanups.push(server.close)
    Cookies.set(key({ assistantId: 'asst_no_metadata' }), threadId)

    renderWithSuperinterface({
      baseUrl: server.baseUrl,
      variables: { assistantId: 'asst_no_metadata' },
      children: (
        <Thread.Root>
          <Thread.Messages />
          <Suggestions>{'Tell me more'}</Suggestions>
          <Thread.MessageForm />
        </Thread.Root>
      ),
    })

    expect(await screen.findByText('Anything else?', {}, TIMEOUT)).toBeTruthy()
    expect(
      screen
        .getByRole('button', { name: 'Tell me more' })
        .hasAttribute('disabled'),
    ).toBe(false)
  }, 60_000)
})
