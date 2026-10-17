import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, screen, waitFor } from '@testing-library/react'
import Cookies from 'js-cookie'
import { Thread } from '@/components/threads/Thread'
import { key } from '@/lib/threadIdStorage/key'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { sendApiMessage } from '../lib/sendApiMessage'
import { sendThreadMessage } from '../lib/sendThreadMessage'
import { setInitialMessages } from '../lib/setInitialMessages'
import { stubIntersectionObserver } from '../lib/stubIntersectionObserver'
import { getApiMessages } from '../lib/getApiMessages'
import { messageTexts } from '../lib/messageTexts'
import { threadIdCookie } from '../lib/threadIdCookie'

const TIMEOUT = { timeout: 15_000 }

describe('message history in a Thread', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>
  let intersectionObserver: ReturnType<typeof stubIntersectionObserver>

  beforeEach(async () => {
    intersectionObserver = stubIntersectionObserver()
    fakeLlm = await startFakeLlm({
      respond: ({ request }) => ({
        content: `Reply to: ${request.body.messages.at(-1).content}`,
      }),
    })
  })

  afterEach(async () => {
    cleanup()
    intersectionObserver.restore()
    await fakeLlm.close()
  })

  it('loads older pages when the top of the thread scrolls into view', async () => {
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    const variables = { publicApiKey: publicKey, assistantId: assistant.id }

    // 11 turns are 22 messages: one full page of 20 and an older page.
    const [{ data: thread }] = await sendApiMessage({
      body: { ...variables, content: 'Message 1' },
    })
    for (let index = 2; index <= 11; index++) {
      await sendApiMessage({
        body: {
          ...variables,
          threadId: thread.id,
          content: `Message ${index}`,
        },
      })
    }
    // A returning visitor: the default cookie storage knows the thread.
    Cookies.set(key({ assistantId: assistant.id }), thread.id)

    renderWithSuperinterface({ variables, children: <Thread /> })

    expect(
      await screen.findByText('Reply to: Message 11', {}, TIMEOUT),
    ).toBeTruthy()
    expect(screen.getByText('Message 2')).toBeTruthy()
    expect(screen.queryByText('Message 1')).toBeNull()
    await waitFor(
      () => expect(intersectionObserver.observedCount()).toBeGreaterThan(0),
      TIMEOUT,
    )

    act(() => intersectionObserver.reveal())

    expect(await screen.findByText('Message 1', {}, TIMEOUT)).toBeTruthy()
    expect(screen.getByText('Reply to: Message 1')).toBeTruthy()
    // The older page was the last one: nothing is left to observe.
    await waitFor(
      () => expect(intersectionObserver.observedCount()).toBe(0),
      TIMEOUT,
    )

    const firstPage = await getApiMessages({
      params: { ...variables, threadId: thread.id },
    })
    expect(firstPage.data).toHaveLength(20)
    expect(firstPage.hasNextPage).toBe(true)
    const olderPage = await getApiMessages({
      params: {
        ...variables,
        threadId: thread.id,
        pageParam: firstPage.lastId!,
      },
    })
    expect(messageTexts({ messages: olderPage.data })).toEqual([
      'assistant: Reply to: Message 1',
      'user: Message 1',
    ])
    expect(olderPage.hasNextPage).toBe(false)
  }, 90_000)

  it('shows initial messages before the first message and keeps them after sending', async () => {
    const { assistant, publicKey, privateKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    await setInitialMessages({
      privateKey,
      assistantId: assistant.id,
      initialMessages: [
        { role: 'ASSISTANT', content: 'Welcome! Ask me anything.' },
        { role: 'USER', content: 'Example question' },
      ],
    })
    const variables = { publicApiKey: publicKey, assistantId: assistant.id }

    renderWithSuperinterface({ variables, children: <Thread /> })

    expect(
      await screen.findByText('Welcome! Ask me anything.', {}, TIMEOUT),
    ).toBeTruthy()
    expect(screen.getByText('Example question')).toBeTruthy()
    expect(threadIdCookie({ assistantId: assistant.id })).toBeNull()

    await sendThreadMessage({ content: 'Real question' })
    expect(
      await screen.findByText('Reply to: Real question', {}, TIMEOUT),
    ).toBeTruthy()
    expect(screen.getByText('Welcome! Ask me anything.')).toBeTruthy()
    expect(screen.getByText('Example question')).toBeTruthy()

    // The new thread starts with the initial messages.
    // BUG (server): on Superinterface Cloud storage the USER initial message
    // is stored with an assistant role (`initialMessages` in the server's
    // createThread passes the uppercase Prisma role through), so a reload
    // shows it as an assistant message.
    const { data } = await getApiMessages({
      params: {
        ...variables,
        threadId: threadIdCookie({ assistantId: assistant.id })!,
      },
    })
    expect(messageTexts({ messages: data })).toEqual([
      'assistant: Reply to: Real question',
      'user: Real question',
      'assistant: Example question',
      'assistant: Welcome! Ask me anything.',
    ])
  }, 60_000)
})
