import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { Thread } from '@/components/threads/Thread'
import { useMessages } from '@/hooks/messages/useMessages'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { findMessageInput } from '../lib/threads/findMessageInput'
import { typeMessage } from '../lib/threads/typeMessage'
import { captureUnhandledRejections } from '../lib/threads/captureUnhandledRejections'
import { messagesSkeletonLines } from '../lib/threads/messagesSkeletonLines'

const LOAD_ERROR = 'Could not load messages. Please try again.'
const SEND_ERROR =
  'Failed to send your message, try again. If you are the owner, check the logs.'

// A name line, then three lines of text spaced apart.
const SKELETON_LINES = [
  { width: '128px', marginTop: '' },
  { width: '256px', marginTop: '' },
  { width: '256px', marginTop: 'var(--space-2)' },
  { width: '256px', marginTop: 'var(--space-2)' },
]

const LoadState = () => {
  const { isLoadingError } = useMessages()

  return <div>{isLoadingError ? 'Messages failed' : 'Messages pending'}</div>
}

describe('Thread errors', () => {
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

  it('tells the user when messages fail to load and keeps the skeleton', async () => {
    const { container } = renderWithSuperinterface({
      variables: { publicApiKey: 'not-a-key', assistantId: setup.assistant.id },
      children: <Thread />,
    })

    expect(
      await screen.findByText(LOAD_ERROR, {}, { timeout: 15_000 }),
    ).toBeTruthy()
    expect(container.querySelectorAll('.rt-Skeleton').length).toBeGreaterThan(0)
    expect(messagesSkeletonLines({ container })).toEqual(SKELETON_LINES)
  }, 30_000)

  it('shows no toast for a load error outside Thread.Root', async () => {
    const { container } = renderWithSuperinterface({
      variables: { publicApiKey: 'not-a-key', assistantId: setup.assistant.id },
      children: (
        <>
          <LoadState />
          <Thread.Messages />
        </>
      ),
    })

    expect(
      await screen.findByText('Messages failed', {}, { timeout: 15_000 }),
    ).toBeTruthy()
    expect(screen.queryByText(LOAD_ERROR)).toBeNull()
    expect(container.querySelectorAll('.rt-Skeleton').length).toBeGreaterThan(0)
    expect(messagesSkeletonLines({ container })).toEqual(SKELETON_LINES)
  }, 30_000)

  it('tells the user when the model fails to reply', async () => {
    renderWithSuperinterface({
      variables: {
        publicApiKey: setup.publicKey,
        assistantId: setup.assistant.id,
      },
      children: <Thread />,
    })

    const textarea = (await findMessageInput()) as HTMLTextAreaElement
    const unhandled = captureUnhandledRejections()
    typeMessage({ textarea, text: 'Are you there?' })

    expect(
      // The server retries the model before failing the run.
      await screen.findByText(SEND_ERROR, {}, { timeout: 45_000 }),
    ).toBeTruthy()
    expect(screen.getByText('Are you there?')).toBeTruthy()
    expect(fakeLlm.completionRequests().length).toBeGreaterThan(0)

    // BUG: the failed send is shown as a toast by onError, but the default
    // onSubmit lets the same error escape as an unhandled rejection.
    await waitFor(() => expect(unhandled.errors).toHaveLength(1))
    unhandled.restore()
    expect((unhandled.errors[0] as Error).message).toBe(SEND_ERROR)
    await waitFor(() =>
      expect(textarea.closest('form')!.querySelector('button')!.type).toBe(
        'submit',
      ),
    )
  }, 60_000)
})
