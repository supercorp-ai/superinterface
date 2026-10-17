import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { Thread } from '@/components/threads/Thread'
import { localStorageOptions } from '@/lib/threadIdStorage/localStorageOptions'
import { key } from '@/lib/threadIdStorage/key'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { sendThreadMessage } from '../lib/sendThreadMessage'
import { getApiMessages } from '../lib/getApiMessages'
import { messageTexts } from '../lib/messageTexts'
import { threadIdCookie } from '../lib/threadIdCookie'

const TIMEOUT = { timeout: 15_000 }

// The fake model answers each user message with `Reply to: <message>`.
const lastUserContent = ({
  messages,
}: {
  messages: { role: string; content: string }[]
}) => messages.filter(({ role }) => role === 'user').at(-1)?.content

describe('sending messages from a Thread', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>
  let setup: Awaited<ReturnType<typeof createTestAssistant>>

  beforeEach(async () => {
    fakeLlm = await startFakeLlm({
      respond: ({ request }) => ({
        content: `Reply to: ${lastUserContent({ messages: request.body.messages })}`,
      }),
    })
    setup = await createTestAssistant({ llmBaseUrl: fakeLlm.baseURL })
  })

  afterEach(async () => {
    cleanup()
    await fakeLlm.close()
  })

  const variables = () => ({
    publicApiKey: setup.publicKey,
    assistantId: setup.assistant.id,
  })

  const waitForIdleForm = () =>
    waitFor(() => {
      expect(
        document.querySelector('form button[type="submit"]'),
      ).not.toBeNull()
    }, TIMEOUT)

  it('remembers the new thread in a cookie and continues it after a remount', async () => {
    renderWithSuperinterface({ variables: variables(), children: <Thread /> })

    await sendThreadMessage({ content: 'First question' })
    expect(await screen.findByText('First question')).toBeTruthy()
    expect(
      await screen.findByText('Reply to: First question', {}, TIMEOUT),
    ).toBeTruthy()

    // The thread.created event stored the thread the server created.
    const threadId = threadIdCookie({ assistantId: setup.assistant.id })
    expect(threadId).toMatch(/^[0-9a-f-]{36}$/)

    await waitForIdleForm()
    await sendThreadMessage({ content: 'Second question' })
    expect(
      await screen.findByText('Reply to: Second question', {}, TIMEOUT),
    ).toBeTruthy()

    // The second message went to the stored thread: the model saw the whole
    // conversation, and the server persisted both turns on that thread.
    const [, secondRequest] = fakeLlm.completionRequests()
    expect(
      secondRequest.body.messages.map(
        ({ role, content }: { role: string; content: string }) =>
          `${role}: ${content}`,
      ),
    ).toEqual([
      'user: First question',
      'assistant: Reply to: First question',
      'user: Second question',
    ])
    const { data } = await getApiMessages({
      params: { ...variables(), threadId: threadId! },
    })
    expect(messageTexts({ messages: data })).toEqual([
      'assistant: Reply to: Second question',
      'user: Second question',
      'assistant: Reply to: First question',
      'user: First question',
    ])

    // A fresh mount (new query cache) loads the stored thread's history.
    cleanup()
    renderWithSuperinterface({ variables: variables(), children: <Thread /> })
    expect(
      await screen.findByText('Reply to: Second question', {}, TIMEOUT),
    ).toBeTruthy()
    expect(screen.getByText('First question')).toBeTruthy()
    expect(threadIdCookie({ assistantId: setup.assistant.id })).toBe(threadId)
  }, 60_000)

  it('stores the thread id in localStorage with the localStorage options', async () => {
    renderWithSuperinterface({
      variables: variables(),
      children: <Thread threadIdStorageOptions={localStorageOptions} />,
    })

    await sendThreadMessage({ content: 'Hello storage' })
    expect(
      await screen.findByText('Reply to: Hello storage', {}, TIMEOUT),
    ).toBeTruthy()

    const storageKey = key({ assistantId: setup.assistant.id })
    await waitFor(
      () => expect(window.localStorage.getItem(storageKey)).toBeTruthy(),
      TIMEOUT,
    )
    expect(threadIdCookie({ assistantId: setup.assistant.id })).toBeNull()

    const { data } = await getApiMessages({
      params: {
        ...variables(),
        threadId: window.localStorage.getItem(storageKey)!,
      },
    })
    expect(messageTexts({ messages: data })).toEqual([
      'assistant: Reply to: Hello storage',
      'user: Hello storage',
    ])
  }, 60_000)

  it('starts a thread with custom storage options and reuses it once set', async () => {
    let storedThreadId: string | null = null
    const calls: string[] = []
    const threadIdStorageOptions = {
      get: ({ assistantId }: { assistantId: string }) => {
        calls.push(`get ${assistantId === setup.assistant.id}`)
        return storedThreadId
      },
      set: ({ threadId }: { assistantId: string; threadId: string }) => {
        calls.push('set')
        storedThreadId = threadId
      },
      remove: () => {
        storedThreadId = null
      },
    }

    renderWithSuperinterface({
      variables: variables(),
      children: <Thread threadIdStorageOptions={threadIdStorageOptions} />,
    })

    await sendThreadMessage({ content: 'Custom one' })
    expect(
      await screen.findByText('Reply to: Custom one', {}, TIMEOUT),
    ).toBeTruthy()
    expect(storedThreadId).toMatch(/^[0-9a-f-]{36}$/)
    expect(calls).toContain('set')
    expect(calls).not.toContain('get false')

    await waitForIdleForm()
    await sendThreadMessage({ content: 'Custom two' })
    expect(
      await screen.findByText('Reply to: Custom two', {}, TIMEOUT),
    ).toBeTruthy()

    const { data } = await getApiMessages({
      params: { ...variables(), threadId: storedThreadId! },
    })
    expect(data).toHaveLength(4)
    expect(threadIdCookie({ assistantId: setup.assistant.id })).toBeNull()
  }, 60_000)

  it('sends to an explicit threadId variable without asking the storage', async () => {
    renderWithSuperinterface({ variables: variables(), children: <Thread /> })
    await sendThreadMessage({ content: 'Seed' })
    expect(await screen.findByText('Reply to: Seed', {}, TIMEOUT)).toBeTruthy()
    const threadId = threadIdCookie({ assistantId: setup.assistant.id })!
    cleanup()

    const gets: string[] = []
    renderWithSuperinterface({
      variables: { ...variables(), threadId },
      children: (
        <Thread
          threadIdStorageOptions={{
            get: ({ assistantId }) => {
              gets.push(assistantId)
              return null
            },
            set: () => {},
            remove: () => {},
          }}
        />
      ),
    })

    // History of the explicit thread loads, and new messages go to it.
    expect(await screen.findByText('Reply to: Seed', {}, TIMEOUT)).toBeTruthy()
    await sendThreadMessage({ content: 'Explicit' })
    expect(
      await screen.findByText('Reply to: Explicit', {}, TIMEOUT),
    ).toBeTruthy()
    expect(gets).toEqual([])

    const { data } = await getApiMessages({
      params: { ...variables(), threadId },
    })
    expect(messageTexts({ messages: data })).toEqual([
      'assistant: Reply to: Explicit',
      'user: Explicit',
      'assistant: Reply to: Seed',
      'user: Seed',
    ])
  }, 60_000)

  it('never restores or records a thread when storage get and set are disabled', async () => {
    renderWithSuperinterface({ variables: variables(), children: <Thread /> })
    await sendThreadMessage({ content: 'Remembered' })
    expect(
      await screen.findByText('Reply to: Remembered', {}, TIMEOUT),
    ).toBeTruthy()
    const rememberedThreadId = threadIdCookie({
      assistantId: setup.assistant.id,
    })
    cleanup()

    // `get: null` and `set: null` override the default cookie storage.
    const threadIdStorageOptions = {
      get: null,
      set: null,
      remove: () => {},
    } as unknown as Parameters<typeof Thread>[0]['threadIdStorageOptions']

    renderWithSuperinterface({
      variables: variables(),
      children: <Thread threadIdStorageOptions={threadIdStorageOptions} />,
    })
    await sendThreadMessage({ content: 'Fresh start' })
    expect(
      await screen.findByText('Reply to: Fresh start', {}, TIMEOUT),
    ).toBeTruthy()

    // The remembered thread was neither shown nor continued: the model only
    // saw the new message, so a second thread was created.
    expect(screen.queryByText('Reply to: Remembered')).toBeNull()
    const [, secondRequest] = fakeLlm.completionRequests()
    expect(secondRequest.body.messages).toHaveLength(1)
    expect(threadIdCookie({ assistantId: setup.assistant.id })).toBe(
      rememberedThreadId,
    )
  }, 60_000)
})
