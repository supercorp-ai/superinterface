import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { Thread } from '@/components/threads/Thread'
import { useMessages } from '@/hooks/messages/useMessages'
import { useAssistant } from '@/hooks/assistants/useAssistant'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { sendThreadMessage } from '../lib/sendThreadMessage'
import { getApiMessages } from '../lib/getApiMessages'
import { messageTexts } from '../lib/messageTexts'
import { threadIdCookie } from '../lib/threadIdCookie'
import { captureUnhandledRejections } from '../lib/captureUnhandledRejections'

const TIMEOUT = { timeout: 15_000 }

const SEND_FAILED =
  'Failed to send your message, try again. If you are the owner, check the logs.'

// Shows the load errors the messages and assistant queries end up with.
const QueryErrors = ({ assistantId }: { assistantId: string }) => {
  const { error: messagesError } = useMessages()
  const { error: assistantError } = useAssistant({ assistantId })

  return (
    <>
      <output data-testid="messages-error">{messagesError?.message}</output>
      <output data-testid="assistant-error">{assistantError?.message}</output>
    </>
  )
}

describe('errors in a Thread', () => {
  const cleanups: (() => Promise<void> | void)[] = []

  afterEach(async () => {
    cleanup()
    for (const fn of cleanups.splice(0)) await fn()
  })

  it('shows a toast when the model fails the run', async () => {
    const fakeLlm = await startFakeLlm({
      respond: () => ({ status: 400, error: 'Model refused' }),
    })
    cleanups.push(fakeLlm.close)
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    const rejections = captureUnhandledRejections()
    cleanups.push(rejections.restore)

    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: <Thread />,
    })
    await sendThreadMessage({ content: 'Will this fail?' })

    expect(await screen.findByText(SEND_FAILED, {}, TIMEOUT)).toBeTruthy()
    expect(screen.getByText('Will this fail?')).toBeTruthy()
    // BUG: the Thread's form awaits createMessage without catching, so the
    // failed send also surfaces as an unhandled promise rejection.
    await waitFor(() => expect(rejections.reasons).toHaveLength(1), TIMEOUT)
    expect((rejections.reasons[0] as Error).message).toBe(SEND_FAILED)

    // The thread was still created and keeps the user's message.
    const threadId = threadIdCookie({ assistantId: assistant.id })!
    const { data } = await getApiMessages({
      params: { publicApiKey: publicKey, assistantId: assistant.id, threadId },
    })
    expect(messageTexts({ messages: data })).toContain('user: Will this fail?')
  }, 60_000)

  it('shows a toast and skeleton when messages cannot be loaded', async () => {
    const fakeLlm = await startFakeLlm()
    cleanups.push(fakeLlm.close)
    const { assistant } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })

    renderWithSuperinterface({
      variables: { publicApiKey: 'not-a-key', assistantId: assistant.id },
      children: (
        <>
          <Thread />
          <QueryErrors assistantId={assistant.id} />
        </>
      ),
    })

    expect(
      await screen.findByText(
        'Could not load messages. Please try again.',
        {},
        TIMEOUT,
      ),
    ).toBeTruthy()
    // The app gets the server's reason for both queries.
    await waitFor(() => {
      expect(screen.getByTestId('messages-error').textContent).toBe(
        'Invalid api key',
      )
      expect(screen.getByTestId('assistant-error').textContent).toBe(
        'Invalid api key',
      )
    }, TIMEOUT)
    expect(fakeLlm.completionRequests()).toEqual([])
  }, 60_000)

  it("shows the server's reason when it refuses a message", async () => {
    const fakeLlm = await startFakeLlm()
    cleanups.push(fakeLlm.close)
    const { assistant } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    const rejections = captureUnhandledRejections()
    cleanups.push(rejections.restore)

    renderWithSuperinterface({
      variables: { publicApiKey: 'not-a-key', assistantId: assistant.id },
      children: <Thread />,
    })
    // Without the assistant, the placeholder has no name.
    await sendThreadMessage({
      content: 'Let me in',
      placeholder: 'Message ...',
    })

    expect(await screen.findByText('Invalid api key', {}, TIMEOUT)).toBeTruthy()
    // BUG: the same unhandled rejection from the Thread's form as above.
    await waitFor(() => expect(rejections.reasons).toHaveLength(1), TIMEOUT)
    expect((rejections.reasons[0] as Error).message).toBe('Invalid api key')
    expect(fakeLlm.completionRequests()).toEqual([])
  }, 60_000)

  it('falls back to generic errors when the server gives no reason', async () => {
    const fakeLlm = await startFakeLlm()
    cleanups.push(fakeLlm.close)
    const { publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    const rejections = captureUnhandledRejections()
    cleanups.push(rejections.restore)

    // BUG (server): a malformed assistant id fails the server's database
    // query, so it answers an empty 500 instead of a JSON 400.
    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: 'not-a-uuid' },
      children: (
        <>
          <Thread />
          <QueryErrors assistantId="not-a-uuid" />
        </>
      ),
    })

    await waitFor(() => {
      expect(screen.getByTestId('messages-error').textContent).toBe(
        'Failed to fetch',
      )
      expect(screen.getByTestId('assistant-error').textContent).toBe(
        'Failed to fetch',
      )
    }, TIMEOUT)

    await sendThreadMessage({ content: 'Hello?', placeholder: 'Message ...' })
    expect(await screen.findByText(SEND_FAILED, {}, TIMEOUT)).toBeTruthy()
    // BUG: the same unhandled rejection from the Thread's form as above.
    await waitFor(() => expect(rejections.reasons).toHaveLength(1), TIMEOUT)
    expect((rejections.reasons[0] as Error).message).toBe(SEND_FAILED)
    expect(fakeLlm.completionRequests()).toEqual([])
  }, 60_000)

  it('tells the user when a send is answered without a body', async () => {
    const fakeLlm = await startFakeLlm()
    cleanups.push(fakeLlm.close)
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    // The app's fetch layer (e.g. a service worker or an API mock) answers
    // the send itself, without a body.
    const realFetch = globalThis.fetch
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input, init) =>
        init?.method === 'POST' && String(input).endsWith('/messages')
          ? Promise.resolve(new Response(null, { status: 200 }))
          : realFetch(input, init),
      )
    cleanups.push(() => fetchSpy.mockRestore())
    const rejections = captureUnhandledRejections()
    cleanups.push(rejections.restore)

    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: <Thread />,
    })
    await sendThreadMessage({ content: 'Anyone home?' })

    expect(
      await screen.findByText('The response body is empty.', {}, TIMEOUT),
    ).toBeTruthy()
    // BUG: the same unhandled rejection from the Thread's form as above.
    await waitFor(() => expect(rejections.reasons).toHaveLength(1), TIMEOUT)
    expect((rejections.reasons[0] as Error).message).toBe(
      'The response body is empty.',
    )
    expect(fakeLlm.completionRequests()).toEqual([])
  }, 60_000)
})
