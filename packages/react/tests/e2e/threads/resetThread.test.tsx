import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { useQueryClient } from '@tanstack/react-query'
import { SuperinterfaceProvider } from '@/components/core/SuperinterfaceProvider'
import { Thread } from '@/components/threads/Thread'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import {
  cookieThreadIdStorageOptions,
  localStorageThreadIdStorageOptions,
  threadIdStorageKey,
} from '@/utils'
import type { ThreadStorageOptions } from '@/types'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { threadIdCookie } from '../lib/threadIdCookie'
import { findMessageInput } from '../lib/threads/findMessageInput'
import { typeMessage } from '../lib/threads/typeMessage'

const TIMEOUT = { timeout: 15_000 }

// The reset button of the reset-thread example: forgets the stored thread
// and reloads the messages.
const ResetThreadButton = () => {
  const { threadIdStorageOptions, variables } = useSuperinterfaceContext()
  const queryClient = useQueryClient()

  return (
    <button
      type="button"
      onClick={() => {
        threadIdStorageOptions?.remove({ assistantId: variables.assistantId })
        queryClient.invalidateQueries()
      }}
    >
      Reset thread
    </button>
  )
}

const storages: {
  name: string
  options: ThreadStorageOptions
  storedThreadId: (args: { assistantId: string }) => string | null
}[] = [
  {
    name: 'cookie',
    options: cookieThreadIdStorageOptions,
    storedThreadId: threadIdCookie,
  },
  {
    name: 'local storage',
    options: localStorageThreadIdStorageOptions,
    storedThreadId: ({ assistantId }) =>
      window.localStorage.getItem(threadIdStorageKey({ assistantId })),
  },
]

describe('resetting the thread', () => {
  let close: () => Promise<void>

  afterEach(async () => {
    cleanup()
    await close()
  })

  it.each(storages)(
    'starts a new thread after removing it from $name storage',
    async ({ options, storedThreadId }) => {
      const fakeLlm = await startFakeLlm({
        replies: [{ content: 'First reply.' }, { content: 'Second reply.' }],
      })
      close = fakeLlm.close
      const { assistant, publicKey } = await createTestAssistant({
        llmBaseUrl: fakeLlm.baseURL,
      })
      const assistantId = assistant.id as string

      renderWithSuperinterface({
        variables: { publicApiKey: publicKey, assistantId },
        children: (
          <SuperinterfaceProvider threadIdStorageOptions={options}>
            <Thread />
            <ResetThreadButton />
          </SuperinterfaceProvider>
        ),
      })

      const textarea = await findMessageInput()
      typeMessage({ textarea, text: 'Remember me' })
      expect(await screen.findByText('First reply.', {}, TIMEOUT)).toBeTruthy()
      const firstThreadId = storedThreadId({ assistantId })
      expect(firstThreadId).toEqual(expect.any(String))

      fireEvent.click(screen.getByText('Reset thread'))

      expect(storedThreadId({ assistantId })).toBeNull()
      await waitFor(() => {
        expect(screen.queryByText('Remember me')).toBeNull()
        expect(screen.queryByText('First reply.')).toBeNull()
      }, TIMEOUT)

      typeMessage({ textarea, text: 'Fresh start' })
      expect(await screen.findByText('Second reply.', {}, TIMEOUT)).toBeTruthy()
      expect(screen.queryByText('Remember me')).toBeNull()
      const secondThreadId = storedThreadId({ assistantId })
      expect(secondThreadId).toEqual(expect.any(String))
      expect(secondThreadId).not.toBe(firstThreadId)
      // The model only saw the new thread's message.
      expect(
        fakeLlm
          .completionRequests()[1]
          .body.messages.filter(({ role }: { role: string }) => role === 'user')
          .map(({ content }: { content: string }) => content),
      ).toEqual(['Fresh start'])
    },
    60_000,
  )
})
