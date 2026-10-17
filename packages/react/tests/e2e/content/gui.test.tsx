import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { Thread } from '@/components/threads/Thread'
import { Gui } from '@/components/gui/Gui'
import { useMessages } from '@/hooks/messages/useMessages'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { createRequestFunction } from '../lib/createRequestFunction'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { startHeldJsonServer } from '../lib/startHeldJsonServer'
import { submitThreadMessage } from '../lib/submitThreadMessage'
import { createOpenaiAssistantsTestAssistant } from '../lib/createOpenaiAssistantsTestAssistant'
import { startFakeAssistantsApi } from '../lib/startFakeAssistantsApi'

describe('Gui', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>
  let weatherApi: Awaited<ReturnType<typeof startHeldJsonServer>>

  afterEach(async () => {
    cleanup()
    await fakeLlm.close()
    await weatherApi.close()
  })

  it('shows the latest reply and the function call in progress', async () => {
    fakeLlm = await startFakeLlm({
      replies: [
        { content: '# Dashboard\n\nNothing checked yet.' },
        {
          toolCalls: [{ name: 'get_weather', arguments: { city: 'Vilnius' } }],
        },
        { content: '# Dashboard\n\nIt is sunny in Vilnius.' },
      ],
    })
    weatherApi = await startHeldJsonServer({ json: { forecast: 'sunny' } })
    const { assistant, privateKey, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    await createRequestFunction({
      assistantId: assistant.id,
      privateKey,
      name: 'get_weather',
      url: `${weatherApi.url}/weather`,
    })

    const { container } = renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: (
        <Thread.Root>
          <Gui />
          <Thread.MessageForm />
        </Thread.Root>
      ),
    })

    // Nothing to show before the assistant replied.
    await submitThreadMessage({ content: 'Open the dashboard' })
    expect(container.querySelector('.rt-Spinner')).toBeTruthy()

    expect(
      await screen.findByText('Nothing checked yet.', {}, { timeout: 15_000 }),
    ).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeTruthy()
    // The user's own message is never shown.
    expect(screen.queryByText('Open the dashboard')).toBeNull()

    await submitThreadMessage({ content: 'Check the weather' })

    // While the function runs, the previous reply stays with the call below:
    // Gui shows the tool call of the run step that is in progress.
    expect(
      await screen.findByText('Calling get_weather', {}, { timeout: 15_000 }),
    ).toBeTruthy()
    expect(screen.getByText('Nothing checked yet.')).toBeTruthy()

    weatherApi.release()

    expect(
      await screen.findByText(
        'It is sunny in Vilnius.',
        {},
        { timeout: 15_000 },
      ),
    ).toBeTruthy()
    await waitFor(() => expect(screen.queryByText(/get_weather/)).toBeNull())
  }, 45_000)
})

// Lists the run steps of the latest assistant message, to know when the
// streamed ones arrived.
const LatestRunSteps = () => {
  const { messages } = useMessages()
  const latest = messages.find(({ role }) => role === 'assistant')

  return (
    <output aria-label="run steps">
      {latest?.runSteps
        .map(({ step_details, status }) => `${step_details.type}:${status}`)
        .join(',')}
    </output>
  )
}

describe('Gui while a run starts', () => {
  let fakeApi: Awaited<ReturnType<typeof startFakeAssistantsApi>>
  const hold = Promise.withResolvers<void>()

  afterEach(async () => {
    hold.resolve()
    cleanup()
    await fakeApi.close()
  })

  const step = ({
    run,
    ...rest
  }: {
    run: { id: string; thread_id: string }
    [key: string]: unknown
  }) => ({
    object: 'thread.run.step',
    created_at: Math.floor(Date.now() / 1000),
    run_id: run.id,
    assistant_id: 'asst_fake',
    thread_id: run.thread_id,
    status: 'in_progress',
    cancelled_at: null,
    completed_at: null,
    expired_at: null,
    failed_at: null,
    last_error: null,
    usage: null,
    ...rest,
  })

  // Replies 'Ready.' first, then starts a run that streams `events` and
  // stays in progress.
  const renderGui = async ({
    events,
  }: {
    events: NonNullable<
      Parameters<typeof startFakeAssistantsApi>[0]['replies'][number]['events']
    >
  }) => {
    fakeApi = await startFakeAssistantsApi({
      replies: [
        { text: 'Ready.' },
        { text: '', waitFor: hold.promise, events },
      ],
    })
    const { assistant, publicKey } = await createOpenaiAssistantsTestAssistant({
      openaiBaseUrl: fakeApi.baseURL,
    })

    const rendered = renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: (
        <Thread.Root>
          <Gui />
          <LatestRunSteps />
          {/* The held run never completes, so its failure is caught here. */}
          <Thread.MessageForm.Root
            onSubmit={async ({ content, reset, createMessage }) => {
              reset()
              await createMessage({ content }).catch(() => {})
            }}
          >
            <Thread.MessageForm.Field.Root>
              <Thread.MessageForm.Field.Control />
            </Thread.MessageForm.Field.Root>
          </Thread.MessageForm.Root>
        </Thread.Root>
      ),
    })

    await submitThreadMessage({ content: 'Start' })
    await screen.findByText('Ready.', {}, { timeout: 15_000 })
    await waitFor(() =>
      expect(rendered.container.querySelector('.rt-Card')).toBeNull(),
    )

    await submitThreadMessage({ content: 'Continue' })

    return rendered
  }

  it('shows a spinner below the previous reply while a reply is written', async () => {
    const { container } = await renderGui({
      events: ({ run, message }) => [
        { event: 'thread.run.created', data: { ...run, status: 'queued' } },
        { event: 'thread.run.in_progress', data: run },
        {
          event: 'thread.message.created',
          data: { ...message, content: [], status: 'in_progress' },
        },
        {
          event: 'thread.run.step.created',
          data: step({
            run,
            id: 'step_message',
            type: 'message_creation',
            step_details: {
              type: 'message_creation',
              message_creation: { message_id: message.id },
            },
          }),
        },
      ],
    })

    await waitFor(
      () =>
        expect(
          screen.getByRole('status', { name: 'run steps' }).textContent,
        ).toBe('message_creation:in_progress'),
      { timeout: 15_000 },
    )
    expect(container.querySelector('.rt-Card .rt-Spinner')).toBeTruthy()
    // The progress card floats centered at the bottom of the page.
    const progress = container.querySelector('.rt-Card')!.parentElement!
    expect(progress.style.position).toBe('fixed')
    expect(progress.style.left).toBe('0px')
    expect(progress.style.bottom).toBe('0px')
    expect(progress.style.right).toBe('0px')
    expect(progress.style.justifyContent).toBe('center')
    expect(screen.getByText('Ready.')).toBeTruthy()
  }, 45_000)

  it('shows the actions being started before a function is called', async () => {
    const { container } = await renderGui({
      events: ({ run }) => [
        { event: 'thread.run.created', data: { ...run, status: 'queued' } },
        { event: 'thread.run.in_progress', data: run },
        {
          event: 'thread.run.step.created',
          data: step({
            run,
            id: 'step_tools',
            type: 'tool_calls',
            step_details: { type: 'tool_calls', tool_calls: [] },
          }),
        },
      ],
    })

    // The in-progress tool_calls step has no tool call yet, so Gui shows
    // that actions are starting instead of a spinner.
    expect(
      await screen.findByText('Starting actions', {}, { timeout: 15_000 }),
    ).toBeTruthy()
    expect(container.querySelector('.rt-Card .rt-Spinner')).toBeNull()
    expect(screen.getByText('Ready.')).toBeTruthy()
  }, 45_000)
})
