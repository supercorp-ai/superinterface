import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { Thread } from '@/components/threads/Thread'
import { Suggestions } from '@/components/suggestions/Suggestions'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { createOpenaiAssistantsTestAssistant } from '../lib/createOpenaiAssistantsTestAssistant'
import { renderAssistantReply } from '../lib/renderAssistantReply'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { startFakeAssistantsApi } from '../lib/startFakeAssistantsApi'
import { submitThreadMessage } from '../lib/submitThreadMessage'

const userMessages = ({
  fakeLlm,
}: {
  fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>
}) =>
  fakeLlm
    .completionRequests()
    .map(({ body }) =>
      body.messages
        .filter(({ role }: { role: string }) => role === 'user')
        .map(({ content }: { content: string }) => content),
    )

describe('suggestions', () => {
  let close: () => Promise<void>

  afterEach(async () => {
    cleanup()
    await close()
  })

  it('sends a suggestion from a reply as the next message', async () => {
    const fakeLlm = await startFakeLlm({
      replies: [
        {
          content: [
            'What next?',
            '',
            '```suggestions',
            'Tell me a joke',
            '',
            '  Show the weather  ',
            '```',
          ].join('\n'),
        },
        { content: 'Why did the chicken cross the road?' },
      ],
    })
    close = fakeLlm.close

    await renderAssistantReply({
      llmBaseUrl: fakeLlm.baseURL,
      waitForText: 'Tell me a joke',
    })

    const joke = screen.getByRole('button', { name: 'Tell me a joke' })
    // The send arrow keeps its size next to a long suggestion.
    expect(joke.querySelector('svg')!.style.flexShrink).toBe('0')
    expect(
      screen.getByRole('button', { name: 'Show the weather' }),
    ).toBeTruthy()

    // Suggestions are disabled until the reply finished streaming.
    await waitFor(() => expect(joke.hasAttribute('disabled')).toBe(false), {
      timeout: 15_000,
    })
    fireEvent.click(joke)

    expect(
      await screen.findByText(
        'Why did the chicken cross the road?',
        {},
        { timeout: 15_000 },
      ),
    ).toBeTruthy()
    expect(userMessages({ fakeLlm })).toEqual([
      ['Hi'],
      ['Hi', 'Tell me a joke'],
    ])
  }, 30_000)

  it('renders nothing for an empty suggestions block', async () => {
    const fakeLlm = await startFakeLlm({
      replies: [{ content: 'No ideas.\n\n```suggestions\n\n```' }],
    })
    close = fakeLlm.close

    await renderAssistantReply({
      llmBaseUrl: fakeLlm.baseURL,
      waitForText: 'No ideas.',
    })

    // Only the form's own submit button is left.
    expect(screen.getAllByRole('button')).toHaveLength(1)
  }, 30_000)

  it('starts a conversation from standalone suggestions', async () => {
    const fakeLlm = await startFakeLlm({
      replies: [{ content: 'Here are the docs.' }],
    })
    close = fakeLlm.close
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })

    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: (
        <Thread.Root>
          <Thread.Messages />
          <Suggestions
            className="starter-suggestions"
            style={{ padding: 4 }}
          >
            {'Open the docs\nContact support'}
          </Suggestions>
          <Suggestions.Item
            suggestion="Pricing"
            isDisabled
            className="custom-item"
            style={{ color: 'red' }}
          />
          <Thread.MessageForm />
        </Thread.Root>
      ),
    })

    const docs = await screen.findByRole(
      'button',
      { name: 'Open the docs' },
      { timeout: 15_000 },
    )
    expect(docs.parentElement!.className).toContain('starter-suggestions')
    expect(docs.parentElement!.style.padding).toBe('4px')

    const pricing = screen.getByRole('button', { name: 'Pricing' })
    expect(pricing.hasAttribute('disabled')).toBe(true)
    expect(pricing.className).toContain('custom-item')
    expect(pricing.style.color).toBe('red')

    await waitFor(() => expect(docs.hasAttribute('disabled')).toBe(false))
    fireEvent.click(docs)

    expect(
      await screen.findByText('Here are the docs.', {}, { timeout: 15_000 }),
    ).toBeTruthy()
    expect(userMessages({ fakeLlm })).toEqual([['Open the docs']])
  }, 30_000)

  it('hides suggestions while the latest message is blocking', async () => {
    const fakeApi = await startFakeAssistantsApi({
      replies: [
        {
          text: 'Please wait for approval.\n\n```suggestions\nApprove\n```',
          metadata: { isBlocking: 'true' },
        },
      ],
    })
    close = fakeApi.close
    const { assistant, publicKey } = await createOpenaiAssistantsTestAssistant({
      openaiBaseUrl: fakeApi.baseURL,
    })

    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: <Thread />,
    })

    await submitThreadMessage({ content: 'Can I deploy?' })
    await screen.findByText(
      'Please wait for approval.',
      {},
      { timeout: 15_000 },
    )

    await waitFor(() =>
      expect(
        (
          screen.getByPlaceholderText(
            'Message E2E Assistant...',
          ) as HTMLTextAreaElement
        ).disabled,
      ).toBe(true),
    )
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
  }, 30_000)
})
