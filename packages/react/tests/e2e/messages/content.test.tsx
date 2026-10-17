import { afterEach, describe, expect, inject, it } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { Thread } from '@/components/threads/Thread'
import { FunctionComponentsContext } from '@/contexts/functions/FunctionComponentsContext'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { createTestFunction } from '../lib/createTestFunction'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { sendThreadMessage } from '../lib/sendThreadMessage'
import { getApiMessages } from '../lib/getApiMessages'
import { messageTexts } from '../lib/messageTexts'
import { threadIdCookie } from '../lib/threadIdCookie'
import { startFakeHttpEndpoint } from '../lib/startFakeHttpEndpoint'
import { SendPreparedMessage } from '../lib/SendPreparedMessage'
import { CachedMessages } from '../lib/CachedMessages'

const TIMEOUT = { timeout: 15_000 }

describe('message content in a Thread', () => {
  const cleanups: (() => Promise<void> | void)[] = []

  afterEach(async () => {
    cleanup()
    for (const fn of cleanups.splice(0)) await fn()
  })

  it('shows images and attachments of the sent message right away', async () => {
    const fakeLlm = await startFakeLlm({
      replies: [{ content: 'Nice pictures.' }],
    })
    cleanups.push(fakeLlm.close)
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    const variables = { publicApiKey: publicKey, assistantId: assistant.id }

    renderWithSuperinterface({
      variables,
      children: (
        <>
          <Thread />
          <SendPreparedMessage
            variables={{
              content: [
                { type: 'image_file', image_file: { file_id: 'file-photo' } },
                {
                  type: 'image_url',
                  image_url: { url: 'https://example.com/cat.png' },
                },
                { type: 'text', text: 'Look at these' },
              ],
              attachments: [
                { file_id: 'file-a', tools: [{ type: 'file_search' }] },
                { file_id: 'file-b', tools: [{ type: 'file_search' }] },
              ],
            }}
          />
        </>
      ),
    })
    fireEvent.click(await screen.findByText('Send prepared', {}, TIMEOUT))

    // The optimistic message renders every part before the server answers.
    expect(await screen.findByText('Look at these')).toBeTruthy()
    expect(screen.getByText('2 files')).toBeTruthy()
    const sources = [...document.querySelectorAll('img')].map((image) =>
      image.getAttribute('src'),
    )
    expect(sources).toContain(
      `${inject('testServer').apiBaseUrl}/files/file-photo/contents?${new URLSearchParams(variables)}`,
    )
    expect(sources).toContain('https://example.com/cat.png')

    // BUG (server): on Superinterface Cloud storage a message with image
    // parts fails its run ("Cannot read properties of undefined (reading
    // 'value')" while preparing the model request).
    expect(
      await screen.findByText(
        'Send result: Failed to send your message, try again. If you are the owner, check the logs.',
        {},
        TIMEOUT,
      ),
    ).toBeTruthy()
    expect(fakeLlm.completionRequests()).toEqual([])
  }, 60_000)

  it('shows a single attachment', async () => {
    const fakeLlm = await startFakeLlm({ replies: [{ content: 'Got it.' }] })
    cleanups.push(fakeLlm.close)
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })

    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: (
        <>
          <Thread />
          <SendPreparedMessage
            variables={{
              content: 'One file',
              attachments: [
                { file_id: 'file-a', tools: [{ type: 'file_search' }] },
              ],
            }}
          />
        </>
      ),
    })
    fireEvent.click(await screen.findByText('Send prepared', {}, TIMEOUT))

    expect(await screen.findByText('One file')).toBeTruthy()
    expect(screen.getByText('1 file')).toBeTruthy()
    expect(
      await screen.findByText('Send result: sent', {}, TIMEOUT),
    ).toBeTruthy()
  }, 60_000)

  it('shows replies that are not valid MDX as plain text', async () => {
    const fakeLlm = await startFakeLlm({
      replies: [{ content: 'Use {curly braces like this' }],
    })
    cleanups.push(fakeLlm.close)
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })

    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: <Thread />,
    })
    await sendThreadMessage({ content: 'Show braces' })

    expect(
      await screen.findByText('Use {curly braces like this', {}, TIMEOUT),
    ).toBeTruthy()
  }, 60_000)

  it('renders a function call with the app’s component for that function', async () => {
    const endpoint = await startFakeHttpEndpoint({
      reply: () => ({ json: { forecast: 'sunny' } }),
    })
    const fakeLlm = await startFakeLlm({
      respond: ({ request }) =>
        request.body.messages.at(-1).role === 'tool'
          ? { content: 'Sunny it is.' }
          : { toolCalls: [{ name: 'get_forecast', arguments: {} }] },
    })
    cleanups.push(endpoint.close, fakeLlm.close)
    const { assistant, publicKey, privateKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    await createTestFunction({
      privateKey,
      assistantId: assistant.id,
      name: 'get_forecast',
      handler: {
        type: 'REQUEST',
        requestHandler: {
          method: 'GET',
          url: `${endpoint.url}/forecast`,
          headers: '{}',
          body: '{}',
        },
      },
    })

    const Forecast = ({ fn }: { fn: { output: string | null } }) => (
      <div>Forecast widget: {fn.output ?? 'loading'}</div>
    )

    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: (
        <FunctionComponentsContext.Provider value={{ get_forecast: Forecast }}>
          <Thread />
        </FunctionComponentsContext.Provider>
      ),
    })
    await sendThreadMessage({ content: 'Forecast?' })

    expect(await screen.findByText('Sunny it is.', {}, TIMEOUT)).toBeTruthy()
    expect(
      await screen.findByText(
        'Forecast widget: {"forecast":"sunny"}',
        {},
        TIMEOUT,
      ),
    ).toBeTruthy()
    expect(screen.queryByText(/get_forecast/)).toBeNull()
  }, 60_000)

  it('sends extra variables with a message', async () => {
    const fakeLlm = await startFakeLlm({
      respond: ({ request }) => ({
        content: `Reply to: ${request.body.messages.at(-1).content}`,
      }),
    })
    cleanups.push(fakeLlm.close)
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    const variables = { publicApiKey: publicKey, assistantId: assistant.id }

    renderWithSuperinterface({
      variables,
      children: (
        <>
          <Thread />
          <SendPreparedMessage
            variables={{ content: 'With a locale', locale: 'lt' }}
          />
        </>
      ),
    })
    fireEvent.click(await screen.findByText('Send prepared', {}, TIMEOUT))

    expect(
      await screen.findByText('Reply to: With a locale', {}, TIMEOUT),
    ).toBeTruthy()
    expect(
      await screen.findByText('Send result: sent', {}, TIMEOUT),
    ).toBeTruthy()
    // BUG: onMutate stores the optimistic user message under a query key
    // built from all the sent variables (here including `locale`), while the
    // Thread lists ['messages', provider variables]; the user's own message
    // never shows until the thread is reloaded.
    expect(screen.queryByText('With a locale')).toBeNull()

    const { data } = await getApiMessages({
      params: {
        ...variables,
        threadId: threadIdCookie({ assistantId: assistant.id })!,
      },
    })
    expect(messageTexts({ messages: data })).toEqual([
      'assistant: Reply to: With a locale',
      'user: With a locale',
    ])
    expect(data[1].metadata).toMatchObject({ locale: 'lt' })
  }, 60_000)

  it('streams into an empty cache when only createMessage is used', async () => {
    const fakeLlm = await startFakeLlm({
      replies: [{ content: 'Headless reply' }],
    })
    cleanups.push(fakeLlm.close)
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })

    // No message list is mounted, and the extra variable keeps the
    // optimistic message out of the key the stream writes to.
    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: (
        <>
          <SendPreparedMessage
            variables={{ content: 'Headless', source: 'widget' }}
          />
          <CachedMessages />
        </>
      ),
    })
    fireEvent.click(await screen.findByText('Send prepared', {}, TIMEOUT))

    expect(
      await screen.findByText('Send result: sent', {}, TIMEOUT),
    ).toBeTruthy()
    await waitFor(async () => {
      const { data } = await getApiMessages({
        params: {
          publicApiKey: publicKey,
          assistantId: assistant.id,
          threadId: threadIdCookie({ assistantId: assistant.id })!,
        },
      })
      expect(messageTexts({ messages: data })).toEqual([
        'assistant: Headless reply',
        'user: Headless',
      ])
    }, TIMEOUT)

    // The stream filled the thread's cache from nothing with the reply.
    await waitFor(() => {
      fireEvent.click(screen.getByText('Read cache'))
      expect(screen.getByTestId('cached-messages').textContent).toBe(
        'assistant: Headless reply',
      )
    }, TIMEOUT)
  }, 60_000)
})
