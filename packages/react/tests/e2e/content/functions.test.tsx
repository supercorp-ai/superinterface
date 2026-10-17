import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import type OpenAI from 'openai'
import { Thread } from '@/components/threads/Thread'
import { FunctionBase } from '@/components/functions/FunctionBase'
import { FunctionComponentsContext } from '@/contexts/functions/FunctionComponentsContext'
import {
  startFakeLlm,
  type FakeLlmReply,
} from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { createRequestFunction } from '../lib/createRequestFunction'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { startHeldJsonServer } from '../lib/startHeldJsonServer'
import { submitThreadMessage } from '../lib/submitThreadMessage'
import { createOpenaiAssistantsTestAssistant } from '../lib/createOpenaiAssistantsTestAssistant'
import { startFakeAssistantsApi } from '../lib/startFakeAssistantsApi'

type FunctionComponentArgs = {
  fn: OpenAI.Beta.Threads.Runs.FunctionToolCall.Function
  runStep: OpenAI.Beta.Threads.Runs.RunStep
}

const WeatherFunction = ({ fn, runStep }: FunctionComponentArgs) => (
  <FunctionBase
    fn={fn}
    runStep={runStep}
    title={`Weather for ${JSON.parse(fn.arguments).city}`}
  />
)

describe('function tool calls', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>
  let weatherApi: Awaited<ReturnType<typeof startHeldJsonServer>>

  afterEach(async () => {
    cleanup()
    await fakeLlm.close()
    await weatherApi.close()
  })

  const renderThread = async ({
    replies,
    wrap = (children) => children,
  }: {
    replies: FakeLlmReply[]
    wrap?: (children: React.ReactNode) => React.ReactNode
  }) => {
    fakeLlm = await startFakeLlm({ replies })
    weatherApi = await startHeldJsonServer({
      json: { forecast: 'sunny', degrees: 21 },
    })
    const { assistant, privateKey, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    await createRequestFunction({
      assistantId: assistant.id,
      privateKey,
      name: 'get_weather',
      url: `${weatherApi.url}/weather`,
    })

    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: wrap(<Thread />),
    })
  }

  const popoverText = async ({ title }: { title: string }) => {
    fireEvent.click(screen.getAllByText(title)[0])
    const dialog = await screen.findByRole('dialog')
    const text = dialog.textContent
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    return text
  }

  it('shows the call while it runs, then its arguments and output', async () => {
    await renderThread({
      replies: [
        {
          toolCalls: [{ name: 'get_weather', arguments: { city: 'Vilnius' } }],
        },
        { content: 'It is sunny in Vilnius.' },
      ],
    })

    await submitThreadMessage({ content: 'Weather in Vilnius?' })

    await screen.findByText('Calling get_weather', {}, { timeout: 15_000 })
    expect(await popoverText({ title: 'Calling get_weather' })).toBe(
      JSON.stringify({ city: 'Vilnius' }, null, 2),
    )

    weatherApi.release()

    await screen.findByText('It is sunny in Vilnius.', {}, { timeout: 15_000 })
    expect(await popoverText({ title: 'Finished get_weather' })).toBe(
      [
        JSON.stringify({ city: 'Vilnius' }, null, 2),
        JSON.stringify({ forecast: 'sunny', degrees: 21 }, null, 2),
      ].join(''),
    )
  }, 30_000)

  it('shows arguments that are not JSON as they are', async () => {
    await renderThread({
      replies: [
        { toolCalls: [{ name: 'get_weather', arguments: 'city=Vilnius' }] },
        { content: 'I could not check the weather.' },
      ],
    })
    weatherApi.release()

    await submitThreadMessage({ content: 'Weather in Vilnius?' })
    await screen.findByText(
      'I could not check the weather.',
      {},
      { timeout: 15_000 },
    )

    const text = await popoverText({ title: 'Finished get_weather' })
    expect(text?.startsWith('city=Vilnius')).toBe(true)
    expect(weatherApi.requests).toEqual([])
  }, 30_000)

  it('shows only the output of a call with empty arguments', async () => {
    await renderThread({
      replies: [
        { toolCalls: [{ name: 'get_weather', arguments: '' }] },
        { content: 'Here is the weather.' },
      ],
    })
    weatherApi.release()

    await submitThreadMessage({ content: 'Weather?' })
    await screen.findByText('Here is the weather.', {}, { timeout: 15_000 })

    fireEvent.click(screen.getAllByText('Finished get_weather')[0])
    const dialog = await screen.findByRole('dialog')
    const code = dialog.querySelector('code')!
    expect(code.style.whiteSpace).toBe('pre')
    expect(code.style.wordBreak).toBe('break-word')
    // The server could not parse the empty arguments, so that is the output.
    expect(code.children).toHaveLength(1)
    expect(JSON.parse(code.textContent!)).toEqual({
      error: 'Unexpected end of JSON input',
    })
  }, 30_000)

  it('renders function components from FunctionComponentsContext', async () => {
    await renderThread({
      replies: [
        { toolCalls: [{ name: 'get_weather', arguments: { city: 'Kaunas' } }] },
        { content: 'It is sunny in Kaunas.' },
      ],
      wrap: (children) => (
        <FunctionComponentsContext.Provider
          value={{ get_weather: WeatherFunction as unknown as React.ReactNode }}
        >
          {children}
        </FunctionComponentsContext.Provider>
      ),
    })
    weatherApi.release()

    await submitThreadMessage({ content: 'Weather in Kaunas?' })
    await screen.findByText('It is sunny in Kaunas.', {}, { timeout: 15_000 })

    expect(screen.getAllByText('Weather for Kaunas').length).toBeGreaterThan(0)
    expect(screen.queryByText('Finished get_weather')).toBeNull()
  }, 30_000)
})

describe('function tool calls of a cancelled run', () => {
  let fakeApi: Awaited<ReturnType<typeof startFakeAssistantsApi>>

  afterEach(async () => {
    cleanup()
    await fakeApi.close()
  })

  it('shows a cancelled call as cancelled', async () => {
    const now = Math.floor(Date.now() / 1000)
    const runStep = ({
      threadId,
      runId,
      ...rest
    }: {
      threadId: string
      runId: string
      [key: string]: unknown
    }) => ({
      object: 'thread.run.step',
      created_at: now,
      run_id: runId,
      assistant_id: 'asst_fake',
      thread_id: threadId,
      cancelled_at: null,
      completed_at: null,
      expired_at: null,
      failed_at: null,
      last_error: null,
      usage: null,
      ...rest,
    })

    fakeApi = await startFakeAssistantsApi({
      replies: [
        {
          text: 'Stopped checking the weather.',
          runSteps: ({ threadId, runId, messageId }) => [
            runStep({
              threadId,
              runId,
              id: 'step_message',
              type: 'message_creation',
              status: 'completed',
              completed_at: now,
              step_details: {
                type: 'message_creation',
                message_creation: { message_id: messageId },
              },
            }),
            runStep({
              threadId,
              runId,
              id: 'step_tools',
              type: 'tool_calls',
              status: 'cancelled',
              cancelled_at: now,
              step_details: {
                type: 'tool_calls',
                tool_calls: [
                  {
                    id: 'call_weather',
                    type: 'function',
                    function: {
                      name: 'get_weather',
                      arguments: '{"city":"Riga"}',
                      output: null,
                    },
                  },
                ],
              },
            }),
          ],
        },
      ],
    })
    const { assistant, publicKey } = await createOpenaiAssistantsTestAssistant({
      openaiBaseUrl: fakeApi.baseURL,
    })

    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: <Thread />,
    })

    await submitThreadMessage({ content: 'Weather in Riga?' })

    expect(
      await screen.findByText('Cancelled get_weather', {}, { timeout: 15_000 }),
    ).toBeTruthy()
  }, 30_000)
})
