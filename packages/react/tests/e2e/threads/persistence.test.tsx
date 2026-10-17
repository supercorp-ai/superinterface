import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { Thread } from '@/components/threads/Thread'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { findMessageInput } from '../lib/threads/findMessageInput'
import { typeMessage } from '../lib/threads/typeMessage'
import { captureUnhandledRejections } from '../lib/threads/captureUnhandledRejections'

const memoryThreadIdStorage = () => {
  const threadIds = new Map<string, string>()

  return {
    threadIds,
    options: {
      get: ({ assistantId }: { assistantId: string }) =>
        threadIds.get(assistantId) ?? null,
      set: ({
        assistantId,
        threadId,
      }: {
        assistantId: string
        threadId: string
      }) => {
        threadIds.set(assistantId, threadId)
      },
      remove: ({ assistantId }: { assistantId: string }) => {
        threadIds.delete(assistantId)
      },
    },
  }
}

describe('Thread provider options', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>
  let setup: Awaited<ReturnType<typeof createTestAssistant>>
  let variables: Record<string, unknown>

  beforeEach(async () => {
    fakeLlm = await startFakeLlm({
      respond: ({ index }) =>
        index === 0
          ? { content: 'I will remember.' }
          : { status: 400, error: 'The model refused.' },
    })
    setup = await createTestAssistant({ llmBaseUrl: fakeLlm.baseURL })
    variables = {
      publicApiKey: setup.publicKey,
      assistantId: setup.assistant.id,
    }
  })

  afterEach(async () => {
    cleanup()
    await fakeLlm.close()
  })

  it('keeps the thread in custom thread id storage across remounts', async () => {
    const storage = memoryThreadIdStorage()

    renderWithSuperinterface({
      variables,
      children: <Thread threadIdStorageOptions={storage.options} />,
    })

    typeMessage({ textarea: await findMessageInput(), text: 'Remember me' })
    expect(
      await screen.findByText('I will remember.', {}, { timeout: 15_000 }),
    ).toBeTruthy()

    const threadId = storage.threadIds.get(setup.assistant.id)
    expect(threadId).toEqual(expect.any(String))
    expect(document.cookie).not.toContain(setup.assistant.id)

    cleanup()
    renderWithSuperinterface({
      variables,
      children: <Thread threadIdStorageOptions={storage.options} />,
    })

    expect(
      await screen.findByText('I will remember.', {}, { timeout: 15_000 }),
    ).toBeTruthy()
    expect(screen.getByText('Remember me')).toBeTruthy()
    expect(fakeLlm.completionRequests()).toHaveLength(1)
  }, 30_000)

  it('uses default mutation options in place of the error toast', async () => {
    const onError = vi.fn()

    renderWithSuperinterface({
      variables,
      children: <Thread defaultOptions={{ mutations: { onError } }} />,
    })

    const textarea = await findMessageInput()
    typeMessage({ textarea, text: 'First' })
    expect(
      await screen.findByText('I will remember.', {}, { timeout: 15_000 }),
    ).toBeTruthy()

    const unhandled = captureUnhandledRejections()
    typeMessage({ textarea, text: 'Second' })

    // The server retries the model before failing the run.
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1), {
      timeout: 45_000,
    })
    expect(onError.mock.calls[0][0].message).toBe(
      'Failed to send your message, try again. If you are the owner, check the logs.',
    )
    expect(
      screen.queryByText(
        'Failed to send your message, try again. If you are the owner, check the logs.',
      ),
    ).toBeNull()

    // BUG: same unhandled rejection from the default onSubmit as without
    // custom options.
    await waitFor(() => expect(unhandled.errors).toHaveLength(1))
    unhandled.restore()
  }, 60_000)
})
