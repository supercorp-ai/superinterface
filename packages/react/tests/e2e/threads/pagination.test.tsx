import { afterEach, beforeEach, describe, expect, inject, it } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
// Mocks the browser's IntersectionObserver, which jsdom lacks, so the test
// can scroll the loader into view with `mockAllIsIntersecting`.
import { mockAllIsIntersecting } from 'react-intersection-observer/test-utils'
import { Thread } from '@/components/threads/Thread'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { sendApiMessage } from '../lib/threads/sendApiMessage'
import { startHeldProxy } from '../lib/threads/startHeldProxy'
import { messagesSkeletonLines } from '../lib/threads/messagesSkeletonLines'

// The server lists 20 messages per page; 11 exchanges make 22 messages.
const EXCHANGES = 11

describe('Thread.Messages pagination', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>

  beforeEach(async () => {
    fakeLlm = await startFakeLlm({
      respond: ({ index }) => ({ content: `Reply ${index + 1}` }),
    })
  })

  afterEach(async () => {
    cleanup()
    await fakeLlm.close()
  })

  it('shows a skeleton for older messages and loads them when scrolled into view', async () => {
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    let threadId: string | undefined

    for (let index = 1; index <= EXCHANGES; index++) {
      ;({ threadId } = await sendApiMessage({
        publicKey,
        assistantId: assistant.id,
        threadId,
        content: `Message ${index}`,
      }))
    }

    const { container } = renderWithSuperinterface({
      variables: {
        publicApiKey: publicKey,
        assistantId: assistant.id,
        threadId,
      },
      children: <Thread />,
    })

    expect(
      await screen.findByText(`Reply ${EXCHANGES}`, {}, { timeout: 15_000 }),
    ).toBeTruthy()
    expect(screen.getByText('Message 2')).toBeTruthy()
    expect(screen.queryByText('Reply 1')).toBeNull()
    expect(screen.queryByText('Message 1')).toBeNull()
    expect(container.querySelectorAll('.rt-Skeleton').length).toBeGreaterThan(0)
    // One message group's worth of placeholder lines stands for the older
    // page.
    expect(messagesSkeletonLines({ container })).toEqual([
      { width: '128px', marginTop: '' },
      { width: '256px', marginTop: '' },
      { width: '256px', marginTop: 'var(--space-2)' },
      { width: '256px', marginTop: 'var(--space-2)' },
    ])

    mockAllIsIntersecting(true)

    expect(
      await screen.findByText('Message 1', {}, { timeout: 15_000 }),
    ).toBeTruthy()
    expect(screen.getByText('Reply 1')).toBeTruthy()
    await waitFor(() =>
      expect(container.querySelectorAll('.rt-Skeleton')).toHaveLength(0),
    )
  }, 60_000)

  it('does not request older messages again while a page is still loading', async () => {
    const serverProxy = await startHeldProxy({
      target: inject('testServer').baseUrl,
    })

    try {
      const { assistant, publicKey } = await createTestAssistant({
        llmBaseUrl: fakeLlm.baseURL,
      })
      let threadId: string | undefined

      for (let index = 1; index <= EXCHANGES; index++) {
        ;({ threadId } = await sendApiMessage({
          publicKey,
          assistantId: assistant.id,
          threadId,
          content: `Message ${index}`,
        }))
      }

      renderWithSuperinterface({
        baseUrl: `${serverProxy.url}/api`,
        variables: {
          publicApiKey: publicKey,
          assistantId: assistant.id,
          threadId,
        },
        children: <Thread />,
      })

      expect(
        await screen.findByText(`Reply ${EXCHANGES}`, {}, { timeout: 15_000 }),
      ).toBeTruthy()

      const olderPageRequests = () =>
        serverProxy.requests.filter(
          ({ method, path }) => method === 'GET' && path === '/api/messages',
        ).length
      const firstPageRequests = olderPageRequests()

      // Hold the request for older messages while the loader stays in view
      // for several throttle windows (500ms each).
      serverProxy.hold({ path: '/api/messages', method: 'GET' })
      mockAllIsIntersecting(true)

      await waitFor(() => expect(serverProxy.pendingCount()).toBe(1))
      await new Promise((resolve) => setTimeout(resolve, 1_500))

      expect(olderPageRequests()).toBe(firstPageRequests + 1)
      expect(screen.queryByText('Message 1')).toBeNull()

      serverProxy.release()

      expect(
        await screen.findByText('Message 1', {}, { timeout: 15_000 }),
      ).toBeTruthy()
      expect(olderPageRequests()).toBe(firstPageRequests + 1)
    } finally {
      await serverProxy.close()
    }
  }, 60_000)
})
