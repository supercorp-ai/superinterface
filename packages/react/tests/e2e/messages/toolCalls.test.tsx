import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Thread } from '@/components/threads/Thread'
import { useMessages } from '@/hooks/messages/useMessages'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'
import {
  startFakeLlm,
  type FakeLlmReply,
  type FakeLlmRequest,
} from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { createTestFunction } from '../lib/createTestFunction'
import { createSiblingAssistant } from '../lib/createSiblingAssistant'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { sendThreadMessage } from '../lib/sendThreadMessage'
import { startFakeHttpEndpoint } from '../lib/startFakeHttpEndpoint'
import { getApiMessages } from '../lib/getApiMessages'
import { threadIdCookie } from '../lib/threadIdCookie'
import { captureUnhandledRejections } from '../lib/captureUnhandledRejections'

const TIMEOUT = { timeout: 15_000 }

type ChatMessage = {
  role: string
  content: string | null
  tool_call_id?: string
}

const chatMessages = ({ request }: { request: FakeLlmRequest }) =>
  request.body.messages as ChatMessage[]

// Answers with `toolCalls` first and with `done` once tool outputs arrive.
const toolCallingLlm = ({
  toolCalls,
  done,
}: {
  toolCalls: Extract<FakeLlmReply, { toolCalls: unknown }>['toolCalls']
  done: string
}) =>
  startFakeLlm({
    respond: ({ request }) => {
      if (chatMessages({ request }).at(-1)?.role === 'tool') {
        return { content: done }
      }

      return { toolCalls }
    },
  })

// The outputs the model received for its tool calls, in call order.
const toolOutputs = ({ request }: { request: FakeLlmRequest }) =>
  chatMessages({ request })
    .filter(({ role }) => role === 'tool')
    .map(({ content }) => content)

// Lists the cached messages' ids, marking optimistic (client-made) ones.
const MessageIds = () => {
  const { messages } = useMessages()

  return (
    <output data-testid="message-ids">
      {messages
        .map(({ id }) => (isOptimistic({ id }) ? 'optimistic' : 'saved'))
        .join(',')}
    </output>
  )
}

// An app's own query under the thread's 'runs' key, showing how many times
// it has loaded.
const RunsLoads = () => {
  const queryClient = useQueryClient()
  const { variables } = useSuperinterfaceContext()
  const queryKey = ['runs', variables]
  const { data } = useQuery({
    queryKey,
    queryFn: () => (queryClient.getQueryData<number>(queryKey) ?? 0) + 1,
  })

  return <output data-testid="runs-loads">{data}</output>
}

describe('tool calls in a Thread', () => {
  const cleanups: (() => Promise<void> | void)[] = []

  afterEach(async () => {
    cleanup()
    for (const fn of cleanups.splice(0)) await fn()
  })

  it('shows a REQUEST function call while it runs and its output once finished', async () => {
    const endpoint = await startFakeHttpEndpoint({
      reply: () => ({ json: { temperature: 21 } }),
    })
    const fakeLlm = await toolCallingLlm({
      toolCalls: [{ name: 'get_weather', arguments: { city: 'Vilnius' } }],
      done: 'It is 21 degrees.',
    })
    cleanups.push(endpoint.close, fakeLlm.close)
    const { assistant, publicKey, privateKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    await createTestFunction({
      privateKey,
      assistantId: assistant.id,
      name: 'get_weather',
      parameters: {
        type: 'object',
        properties: { city: { type: 'string' } },
      },
      handler: {
        type: 'REQUEST',
        requestHandler: {
          method: 'GET',
          url: `${endpoint.url}/weather`,
          headers: '{}',
          body: '{}',
        },
      },
    })
    const held = endpoint.holdRequests()

    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: <Thread />,
    })
    await sendThreadMessage({ content: 'Weather in Vilnius?' })

    // While the request is in flight the run step shows the call as running.
    await held.received
    expect(
      await screen.findByText('Calling get_weather', {}, TIMEOUT),
    ).toBeTruthy()
    held.release()

    expect(
      await screen.findByText('It is 21 degrees.', {}, TIMEOUT),
    ).toBeTruthy()
    const finished = await screen.findByText(
      'Finished get_weather',
      {},
      TIMEOUT,
    )

    // The completed run step carries the arguments and the request's output.
    fireEvent.click(finished)
    expect(await screen.findByText(/"city": "Vilnius"/)).toBeTruthy()
    expect(screen.getByText(/"temperature": 21/)).toBeTruthy()
    expect(endpoint.requests.map(({ url }) => url)).toEqual([
      '/weather?city=Vilnius',
    ])

    const [, secondRequest] = fakeLlm.completionRequests()
    expect(toolOutputs({ request: secondRequest })).toEqual([
      '{"temperature":21}',
    ])
  }, 60_000)

  it('runs CLIENT_TOOL functions in the browser and submits their outputs', async () => {
    const fakeLlm = await toolCallingLlm({
      toolCalls: [
        { name: 'client_tool', arguments: { mode: 'object' } },
        { name: 'client_tool', arguments: { mode: 'string' } },
        { name: 'client_tool', arguments: { mode: 'nothing' } },
        { name: 'client_tool', arguments: { mode: 'throw' } },
        { name: 'client_tool', arguments: { mode: 'circular' } },
        { name: 'missing_tool', arguments: {} },
      ],
      done: 'Client tools done.',
    })
    cleanups.push(fakeLlm.close)
    const { assistant, publicKey, privateKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    await createTestFunction({
      privateKey,
      assistantId: assistant.id,
      name: 'client_tool',
      parameters: {
        type: 'object',
        properties: { mode: { type: 'string' } },
      },
      handler: {
        type: 'CLIENT_TOOL',
        clientToolHandler: {
          type: 'FUNCTION',
          name: 'e2eClientTool',
          arguments: '{}',
        },
      },
    })
    await createTestFunction({
      privateKey,
      assistantId: assistant.id,
      name: 'missing_tool',
      handler: {
        type: 'CLIENT_TOOL',
        clientToolHandler: {
          type: 'FUNCTION',
          name: 'e2eNotDefinedOnWindow',
          arguments: '{}',
        },
      },
    })

    const calls: unknown[] = []
    const windowWithTools = window as unknown as Record<string, unknown>
    windowWithTools.e2eClientTool = async (args: { mode: string }) => {
      calls.push(args)
      if (args.mode === 'object') return { shown: true }
      if (args.mode === 'string') return 'plain text'
      if (args.mode === 'throw') throw new Error('Modal is closed')
      if (args.mode === 'circular') {
        const circular: Record<string, unknown> = {}
        circular.self = circular
        return circular
      }
      return undefined
    }
    cleanups.push(() => {
      delete windowWithTools.e2eClientTool
    })

    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: <Thread />,
    })
    await sendThreadMessage({ content: 'Use the client tools' })

    expect(
      await screen.findByText('Client tools done.', {}, { timeout: 30_000 }),
    ).toBeTruthy()
    expect(calls).toHaveLength(5)

    const [, secondRequest] = fakeLlm.completionRequests()
    expect(toolOutputs({ request: secondRequest })).toEqual([
      '{"shown":true}',
      'plain text',
      '',
      'Error: Modal is closed',
      expect.stringMatching(/^Error: .*circular/i),
      'Error: client function e2eNotDefinedOnWindow is not defined.',
    ])
  }, 60_000)

  it('streams an ASSISTANT function’s answer into the tool call output', async () => {
    const fakeLlm = await startFakeLlm({
      respond: ({ request }) => {
        const messages = chatMessages({ request })
        if (messages.at(-1)?.role === 'tool') return { content: 'Parent done.' }
        if (messages.at(-1)?.content === 'Hi child') {
          return { content: 'Child says hi.' }
        }

        return {
          toolCalls: [
            { name: 'ask_child', arguments: { message: 'Hi child' } },
          ],
        }
      },
    })
    cleanups.push(fakeLlm.close)
    const { assistant, publicKey, privateKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    const child = await createSiblingAssistant({ privateKey, assistant })
    await createTestFunction({
      privateKey,
      assistantId: assistant.id,
      name: 'ask_child',
      parameters: {
        type: 'object',
        properties: { message: { type: 'string' } },
      },
      handler: {
        type: 'ASSISTANT',
        assistantHandler: { assistantId: child.id },
      },
    })

    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: <Thread />,
    })
    await sendThreadMessage({ content: 'Ask the child' })

    expect(await screen.findByText('Parent done.', {}, TIMEOUT)).toBeTruthy()
    fireEvent.click(await screen.findByText('Finished ask_child', {}, TIMEOUT))
    expect(await screen.findByText('Child says hi.')).toBeTruthy()

    const threadId = threadIdCookie({ assistantId: assistant.id })!
    const { data } = await getApiMessages({
      params: { publicApiKey: publicKey, assistantId: assistant.id, threadId },
    })
    const toolCallStep = data
      .flatMap(({ runSteps }) => runSteps)
      .find(({ step_details }) => step_details.type === 'tool_calls')
    expect(toolCallStep?.step_details).toMatchObject({
      tool_calls: [
        { function: { name: 'ask_child', output: 'Child says hi.' } },
      ],
    })
  }, 60_000)

  it('stops streaming when the user aborts and reloads the thread and its runs from the server', async () => {
    const endpoint = await startFakeHttpEndpoint({
      reply: () => ({ json: { slow: true } }),
    })
    const fakeLlm = await toolCallingLlm({
      toolCalls: [{ name: 'slow_lookup', arguments: {} }],
      done: 'Slow lookup done.',
    })
    cleanups.push(endpoint.close, fakeLlm.close)
    const { assistant, publicKey, privateKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    await createTestFunction({
      privateKey,
      assistantId: assistant.id,
      name: 'slow_lookup',
      handler: {
        type: 'REQUEST',
        requestHandler: {
          method: 'GET',
          url: `${endpoint.url}/slow`,
          headers: '{}',
          body: '{}',
        },
      },
    })
    const held = endpoint.holdRequests()

    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: (
        <>
          <Thread />
          <MessageIds />
          <RunsLoads />
        </>
      ),
    })
    await sendThreadMessage({ content: 'Look it up slowly' })
    await held.received
    expect(
      await screen.findByText('Calling slow_lookup', {}, TIMEOUT),
    ).toBeTruthy()

    expect(screen.getByTestId('runs-loads').textContent).toBe('1')
    const rejections = captureUnhandledRejections()
    cleanups.push(rejections.restore)

    // The submit button turns into a stop button while the run streams.
    const stopButton = document.querySelector<HTMLButtonElement>(
      'form button[type="button"]',
    )!
    fireEvent.click(stopButton)

    // Aborting is not an error: no toast, the form is usable again and the
    // thread is reloaded from the server (no optimistic messages remain).
    await waitFor(
      () =>
        expect(
          document.querySelector('form button[type="submit"]'),
        ).not.toBeNull(),
      TIMEOUT,
    )
    expect(await screen.findByText('Look it up slowly')).toBeTruthy()
    await waitFor(
      () =>
        expect(screen.getByTestId('message-ids').textContent).toBe(
          'saved,saved',
        ),
      TIMEOUT,
    )
    await waitFor(
      () => expect(screen.getByTestId('runs-loads').textContent).toBe('2'),
      TIMEOUT,
    )
    expect(screen.queryByText(/Failed to send/)).toBeNull()
    // BUG: the Thread's form awaits createMessage without catching, so the
    // aborted send also surfaces as an unhandled promise rejection.
    await waitFor(() => expect(rejections.reasons).toHaveLength(1), TIMEOUT)
    expect((rejections.reasons[0] as Error).name).toBe('AbortError')
    held.release()

    // The run finishes on the server; reloading shows its answer.
    const threadId = threadIdCookie({ assistantId: assistant.id })!
    await waitFor(async () => {
      const { data } = await getApiMessages({
        params: {
          publicApiKey: publicKey,
          assistantId: assistant.id,
          threadId,
        },
      })
      expect(data[0].content).toMatchObject([
        { text: { value: 'Slow lookup done.' } },
      ])
    }, TIMEOUT)
  }, 60_000)
})
