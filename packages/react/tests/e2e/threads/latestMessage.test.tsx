import { afterEach, beforeEach, describe, expect, inject, it } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { Thread } from '@/components/threads/Thread'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useIsMutatingMessage } from '@/hooks/messages/useIsMutatingMessage'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { findMessageInput } from '../lib/threads/findMessageInput'
import { sendApiMessage } from '../lib/threads/sendApiMessage'
import { setInitialMessages } from '../lib/threads/setInitialMessages'
import { typeMessage } from '../lib/threads/typeMessage'
import { startHeldProxy } from '../lib/threads/startHeldProxy'
import { waitForPending } from '../lib/threads/waitForPending'

// What Thread.Messages picks its progress indicator from: whether a message
// is being sent, and the latest message's role, id and status.
const ProgressState = () => {
  const { latestMessage } = useLatestMessage()
  const isMutatingMessage = useIsMutatingMessage()

  return (
    <output data-testid="progress-state">
      {JSON.stringify({
        isMutatingMessage,
        role: latestMessage?.role,
        isOptimistic: isOptimistic({ id: latestMessage?.id ?? '' }),
        status: latestMessage?.status ?? null,
      })}
    </output>
  )
}

const progressState = () =>
  JSON.parse(screen.getByTestId('progress-state').textContent!)

describe('Thread and its latest message', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>
  let setup: Awaited<ReturnType<typeof createTestAssistant>>

  beforeEach(async () => {
    fakeLlm = await startFakeLlm({
      respond: () => ({ status: 400, error: 'The model refused.' }),
    })
    setup = await createTestAssistant({ llmBaseUrl: fakeLlm.baseURL })
  })

  afterEach(async () => {
    cleanup()
    await fakeLlm.close()
  })

  it('shows initial messages ending with a user message, ready for input', async () => {
    await setInitialMessages({
      privateKey: setup.privateKey,
      assistantId: setup.assistant.id,
      initialMessages: [
        { role: 'ASSISTANT', content: 'Welcome!' },
        { role: 'USER', content: 'I have a question' },
      ],
    })

    const { container } = renderWithSuperinterface({
      variables: {
        publicApiKey: setup.publicKey,
        assistantId: setup.assistant.id,
      },
      children: <Thread />,
    })

    expect(
      await screen.findByText('I have a question', {}, { timeout: 15_000 }),
    ).toBeTruthy()
    expect(screen.getByText('Welcome!')).toBeTruthy()
    // The user's group shows a rounded 24px avatar slot before its name.
    const userAvatar = screen.getByText('You').closest('.rt-r-gap-3')!
      .firstElementChild as HTMLElement
    expect(userAvatar.style.borderRadius).toBe('var(--radius-3)')
    expect(userAvatar.style.overflow).toBe('hidden')

    const textarea = (await findMessageInput()) as HTMLTextAreaElement
    expect(textarea.disabled).toBe(false)
    // No reply is on its way, so no starting skeleton.
    expect(container.querySelectorAll('.rt-Skeleton')).toHaveLength(0)
  }, 30_000)

  it('keeps the form disabled while the latest message is blocking', async () => {
    // The model fails, so the user's blocking message stays the latest.
    const { threadId } = await sendApiMessage({
      publicKey: setup.publicKey,
      assistantId: setup.assistant.id,
      content: 'Wait for me',
      variables: { isBlocking: true },
    })

    const { container } = renderWithSuperinterface({
      variables: {
        publicApiKey: setup.publicKey,
        assistantId: setup.assistant.id,
        threadId,
      },
      children: <Thread />,
    })

    expect(
      await screen.findByText('Wait for me', {}, { timeout: 15_000 }),
    ).toBeTruthy()
    const textarea = (await findMessageInput()) as HTMLTextAreaElement
    expect(textarea.disabled).toBe(true)
    expect(textarea.closest('form')!.querySelector('button')!.disabled).toBe(
      true,
    )
    expect(container.querySelectorAll('.rt-Skeleton')).toHaveLength(0)
  }, 30_000)

  it('shows reply progress: the assistant starting under an optimistic latest message while mutating, then a typing skeleton', async () => {
    const replyingLlm = await startFakeLlm({
      replies: [{ content: 'Hello from the fake model.' }],
    })
    const serverProxy = await startHeldProxy({
      target: inject('testServer').baseUrl,
    })
    const llmProxy = await startHeldProxy({ target: replyingLlm.baseURL })

    try {
      const { assistant, publicKey } = await createTestAssistant({
        llmBaseUrl: `${llmProxy.url}/v1`,
      })
      const { container } = renderWithSuperinterface({
        baseUrl: `${serverProxy.url}/api`,
        variables: { publicApiKey: publicKey, assistantId: assistant.id },
        children: (
          <>
            <Thread />
            <ProgressState />
          </>
        ),
      })
      const textarea = await findMessageInput()
      const list = container.querySelector('.rt-r-fd-column-reverse')!
      // Under the top spacer, the newest group: the progress indicator.
      const progressGroup = () => list.children[1]
      await waitFor(() =>
        expect(container.querySelectorAll('.rt-Skeleton')).toHaveLength(0),
      )

      serverProxy.hold({ path: '/api/messages', method: 'POST' })
      llmProxy.hold({ path: '/chat/completions' })
      typeMessage({ textarea, text: 'Are you there?' })
      await waitForPending({ proxy: serverProxy })

      // Until the server has the message, the latest message is the user's
      // optimistic one while it is being sent, and the assistant shows as
      // starting: avatar, name and a skeleton under the user's own message.
      expect(progressState()).toEqual({
        isMutatingMessage: true,
        role: 'user',
        isOptimistic: true,
        status: null,
      })
      const starting = progressGroup()
      expect(starting.textContent).toBe('E2E Assistant')
      expect(starting.querySelector('.rt-AvatarRoot')).not.toBeNull()
      const startingSkeleton =
        starting.querySelector<HTMLElement>('.rt-Skeleton')!
      expect(startingSkeleton.style.borderRadius).toBe('var(--radius-6)')
      expect(startingSkeleton.style.flexShrink).toBe('0')
      const userGroup = list.children[2]
      expect(userGroup.textContent).toBe('YouAre you there?')
      const userAvatar = userGroup.querySelector('.rt-r-gap-3')!
        .firstElementChild as HTMLElement
      expect(userAvatar.style.borderRadius).toBe('var(--radius-3)')
      expect(userAvatar.style.overflow).toBe('hidden')

      // Once the server has it and the run waits for the model, only an
      // empty avatar slot and a typing skeleton remain.
      serverProxy.release()
      await waitForPending({ proxy: llmProxy })
      await waitFor(() => expect(progressGroup().textContent).toBe(''))
      // The latest message is now the assistant's in-progress reply.
      expect(progressState()).toEqual({
        isMutatingMessage: true,
        role: 'assistant',
        isOptimistic: true,
        status: 'in_progress',
      })
      expect(progressGroup().querySelector('.rt-AvatarRoot')).toBeNull()
      expect(
        progressGroup().querySelector<HTMLElement>('.rt-Skeleton')!.style
          .borderRadius,
      ).toBe('var(--radius-6)')

      llmProxy.release()
      expect(
        await screen.findByText(
          'Hello from the fake model.',
          {},
          { timeout: 15_000 },
        ),
      ).toBeTruthy()
      await waitFor(() =>
        expect(textarea.closest('form')!.querySelector('button')!.type).toBe(
          'submit',
        ),
      )
      expect(list.querySelectorAll('.rt-Skeleton')).toHaveLength(0)
      expect(progressState()).toEqual({
        isMutatingMessage: false,
        role: 'assistant',
        isOptimistic: false,
        status: 'completed',
      })
      expect(progressGroup().textContent).toBe(
        'E2E AssistantHello from the fake model.',
      )
    } finally {
      await serverProxy.close()
      await llmProxy.close()
      await replyingLlm.close()
    }
  }, 30_000)
})
