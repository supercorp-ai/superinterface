import { afterEach, describe, expect, it } from 'vitest'
import {
  act,
  cleanup,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query'
import { inject } from 'vitest'
import { SuperinterfaceProvider } from '@/components/core/SuperinterfaceProvider'
import { ComponentsProvider } from '@/components/components/ComponentsProvider'
import { Thread } from '@/components/threads/Thread'
import { useCreateMessage } from '@/hooks/messages/useCreateMessage'
import { useIsMutatingMessage } from '@/hooks/messages/useIsMutatingMessage'
import { useMessages } from '@/hooks/messages/useMessages'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useLatestAssistantMessage } from '@/hooks/messages/useLatestAssistantMessage'
import { useLatestAssistantMessageWithContent } from '@/hooks/messages/useLatestAssistantMessageWithContent'
import { useMessageContext } from '@/hooks/messages/useMessageContext'
import { useAssistant } from '@/hooks/assistants/useAssistant'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { createTestFunction } from '../lib/createTestFunction'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { sendThreadMessage } from '../lib/sendThreadMessage'
import { startFakeHttpEndpoint } from '../lib/startFakeHttpEndpoint'
import { startHeldProxy } from '../lib/threads/startHeldProxy'
import { waitForPending } from '../lib/threads/waitForPending'

const SEND_FAILED =
  'Failed to send your message, try again. If you are the owner, check the logs.'

const TIMEOUT = { timeout: 15_000 }

// Wraps hooks the way an app embeds Superinterface, without the UI.
const providers = ({
  variables,
  baseUrl = inject('testServer').apiBaseUrl,
}: {
  variables: Record<string, unknown>
  baseUrl?: string
}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SuperinterfaceProvider
        baseUrl={baseUrl}
        variables={variables}
      >
        {children}
      </SuperinterfaceProvider>
    </QueryClientProvider>
  )
}

// All message hooks an app might read, rendered together.
const useMessageHooks = ({
  createMessageArgs,
}: {
  createMessageArgs?: Parameters<typeof useCreateMessage>
}) => ({
  ...useCreateMessage(...(createMessageArgs ?? [])),
  isMutatingMessage: useIsMutatingMessage(),
  messages: useMessages().messages,
  latestMessage: useLatestMessage().latestMessage,
  ...useLatestAssistantMessage(),
  ...useLatestAssistantMessageWithContent(),
})

describe('message hooks', () => {
  const cleanups: (() => Promise<void> | void)[] = []

  afterEach(async () => {
    cleanup()
    for (const fn of cleanups.splice(0)) await fn()
  })

  it('tracks a send through createMessage, the mutating flag and the latest messages', async () => {
    const endpoint = await startFakeHttpEndpoint({
      reply: () => ({ json: { ok: true } }),
    })
    const fakeLlm = await startFakeLlm({
      respond: ({ request }) => {
        const last = request.body.messages.at(-1)
        if (last.role === 'tool') return { content: 'Looked it up.' }
        if (last.content === 'Look it up') {
          return { toolCalls: [{ name: 'lookup', arguments: {} }] }
        }

        return { content: `Reply to: ${last.content}` }
      },
    })
    cleanups.push(endpoint.close, fakeLlm.close)
    const { assistant, publicKey, privateKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    await createTestFunction({
      privateKey,
      assistantId: assistant.id,
      name: 'lookup',
      handler: {
        type: 'REQUEST',
        requestHandler: {
          method: 'GET',
          url: `${endpoint.url}/lookup`,
          headers: '{}',
          body: '{}',
        },
      },
    })

    const { result } = renderHook(() => useMessageHooks({}), {
      wrapper: providers({
        variables: { publicApiKey: publicKey, assistantId: assistant.id },
      }),
    })

    await waitFor(() => expect(result.current.messages).toEqual([]), TIMEOUT)
    expect(result.current.latestMessage).toBeNull()
    expect(result.current.latestAssistantMessage).toBeNull()
    expect(result.current.latestAssistantMessageWithContent).toBeNull()
    expect(result.current.isMutatingMessage).toBe(false)

    await act(() => result.current.createMessage({ content: 'Hello hooks' }))
    await waitFor(() => expect(result.current.isMutatingMessage).toBe(false))
    expect(result.current.latestMessage?.role).toBe('assistant')
    expect(result.current.latestAssistantMessageWithContent?.content).toEqual([
      {
        type: 'text',
        text: { value: 'Reply to: Hello hooks', annotations: [] },
      },
    ])

    // Mid-run the newest assistant message has no text yet, so the latest
    // one with content is still the previous answer.
    const held = endpoint.holdRequests()
    let sending: Promise<unknown> = Promise.resolve()
    act(() => {
      sending = result.current.createMessage({ content: 'Look it up' })
    })
    await waitFor(
      () => expect(result.current.isMutatingMessage).toBe(true),
      TIMEOUT,
    )
    await held.received
    await waitFor(
      () =>
        expect(result.current.latestAssistantMessage?.runSteps).not.toEqual([]),
      TIMEOUT,
    )
    expect(result.current.latestAssistantMessage?.content).toEqual([
      { type: 'text', text: { value: '', annotations: [] } },
    ])
    expect(
      result.current.latestAssistantMessageWithContent?.content[0],
    ).toMatchObject({ text: { value: 'Reply to: Hello hooks' } })
    held.release()
    await act(() => sending)

    await waitFor(() => expect(result.current.isMutatingMessage).toBe(false))
    expect(
      result.current.latestAssistantMessageWithContent?.content[0],
    ).toMatchObject({ text: { value: 'Looked it up.' } })
  }, 60_000)

  it('rejects createMessage when the server refuses the message', async () => {
    const fakeLlm = await startFakeLlm()
    cleanups.push(fakeLlm.close)
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    const wrapper = providers({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
    })

    // Without options, and with options but no onError, errors only reject.
    const noOptions = renderHook(() => useCreateMessage(), { wrapper })
    const emptyOptions = renderHook(() => useCreateMessage({}), { wrapper })
    const errors: unknown[] = []
    const withOnError = renderHook(
      () => useCreateMessage({ onError: (error) => errors.push(error) }),
      { wrapper },
    )

    // BUG: the server's own reason ("No content found.") is replaced with a
    // generic message.
    for (const { result } of [noOptions, emptyOptions, withOnError]) {
      await expect(
        result.current.createMessage({ content: '' }),
      ).rejects.toThrow(SEND_FAILED)
    }
    expect(errors).toHaveLength(1)
    expect((errors[0] as Error).message).toBe(SEND_FAILED)
    expect(fakeLlm.completionRequests()).toEqual([])
  }, 60_000)

  it('cancels the messages query in flight and gives onError the previous query data', async () => {
    const fakeLlm = await startFakeLlm()
    const serverProxy = await startHeldProxy({
      target: inject('testServer').baseUrl,
    })
    cleanups.push(fakeLlm.close, serverProxy.close)
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    const variables = { publicApiKey: publicKey, assistantId: assistant.id }
    const contexts: unknown[] = []
    const useOptimisticSend = () => ({
      ...useCreateMessage({
        onError: (_error: unknown, _variables?: unknown, context?: unknown) => {
          contexts.push(context)
        },
      }),
      messagesQuery: useMessages(),
      queryClient: useQueryClient(),
    })

    // onMutate hands the cache it replaced, and the message, to onError.
    const loaded = renderHook(useOptimisticSend, {
      wrapper: providers({ variables }),
    })
    await waitFor(
      () => expect(loaded.result.current.messagesQuery.isSuccess).toBe(true),
      TIMEOUT,
    )
    const prevMessages = loaded.result.current.queryClient.getQueryData([
      'messages',
      variables,
    ])
    expect(prevMessages).toMatchObject({ pages: [{ data: [] }] })

    await act(() =>
      expect(
        loaded.result.current.createMessage({ content: '' }),
      ).rejects.toThrow(SEND_FAILED),
    )
    expect(contexts).toEqual([
      { prevMessages, newMessage: { ...variables, content: '' } },
    ])
    loaded.unmount()

    // A message sent while the messages are still loading cancels that
    // load, so its late, empty answer cannot replace the optimistic message.
    serverProxy.hold({ path: '/api/messages', method: 'GET' })
    const loading = renderHook(useOptimisticSend, {
      wrapper: providers({ variables, baseUrl: `${serverProxy.url}/api` }),
    })
    await waitForPending({ proxy: serverProxy })

    await act(() =>
      expect(
        loading.result.current.createMessage({ content: '' }),
      ).rejects.toThrow(SEND_FAILED),
    )
    expect(contexts[1]).toEqual({
      prevMessages: undefined,
      newMessage: { ...variables, content: '' },
    })
    serverProxy.release()
    await waitFor(() =>
      expect(
        serverProxy.requests.filter(({ method }) => method === 'GET'),
      ).toHaveLength(1),
    )
    await new Promise((resolve) => setTimeout(resolve, 500))

    expect(loading.result.current.messagesQuery.messages).toHaveLength(1)
    expect(loading.result.current.messagesQuery.messages[0]).toMatchObject({
      role: 'user',
      content: [{ type: 'text', text: { value: '', annotations: [] } }],
    })
    expect(loading.result.current.messagesQuery.messages[0].id).toMatch(/^-/)
  }, 60_000)

  it('cannot load or send messages without an assistant id', async () => {
    const { publicKey } = await createTestAssistant({
      llmBaseUrl: 'http://127.0.0.1:9/v1',
    })

    const { result } = renderHook(
      () => ({ messages: useMessages(), ...useCreateMessage() }),
      { wrapper: providers({ variables: { publicApiKey: publicKey } }) },
    )

    await waitFor(
      () => expect(result.current.messages.isError).toBe(true),
      TIMEOUT,
    )
    // BUG: the server's reasons ("No assistant id found", "No assistantId
    // found.") are replaced with generic errors.
    expect(result.current.messages.error?.message).toBe('Failed to fetch')
    await expect(
      result.current.createMessage({ content: 'Anyone there?' }),
    ).rejects.toThrow(SEND_FAILED)
  }, 60_000)

  it('gives custom message components the message they render', async () => {
    const fakeLlm = await startFakeLlm({
      replies: [{ content: 'Assistant text' }],
    })
    cleanups.push(fakeLlm.close)
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })

    // A custom TextContent reading the message from its MessageContext.
    const RoleTaggedText = ({
      content,
    }: {
      content: { text: { value: string } }
    }) => {
      const { message } = useMessageContext()

      return (
        <span>
          {message?.role}: {content.text.value}
        </span>
      )
    }

    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: (
        <ComponentsProvider components={{ TextContent: RoleTaggedText }}>
          <Thread />
        </ComponentsProvider>
      ),
    })
    await sendThreadMessage({ content: 'User text' })

    expect(
      await screen.findByText('assistant: Assistant text', {}, TIMEOUT),
    ).toBeTruthy()
    expect(screen.getByText('user: User text')).toBeTruthy()
  }, 60_000)

  it('loads the assistant and leaves it null while loading', async () => {
    const fakeLlm = await startFakeLlm()
    cleanups.push(fakeLlm.close)
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })

    const { result } = renderHook(
      () => useAssistant({ assistantId: assistant.id }),
      {
        wrapper: providers({ variables: { publicApiKey: publicKey } }),
      },
    )

    expect(result.current.assistant).toBeNull()
    await waitFor(
      () => expect(result.current.assistant?.name).toBe('E2E Assistant'),
      TIMEOUT,
    )
  }, 60_000)
})
