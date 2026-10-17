import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { Thread } from '@/components/threads/Thread'
import { createOpenaiAssistantsTestAssistant } from '../lib/createOpenaiAssistantsTestAssistant'
import { emulateIntersectionObserver } from '../lib/emulateIntersectionObserver'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { startFakeAssistantsApi } from '../lib/startFakeAssistantsApi'
import { submitThreadMessage } from '../lib/submitThreadMessage'

describe('long threads', () => {
  let fakeApi: Awaited<ReturnType<typeof startFakeAssistantsApi>>
  let restoreIntersectionObserver: () => void

  beforeEach(() => {
    restoreIntersectionObserver = emulateIntersectionObserver()
  })

  afterEach(async () => {
    cleanup()
    restoreIntersectionObserver()
    await fakeApi.close()
  })

  it('loads older messages once the top of the thread is in view', async () => {
    fakeApi = await startFakeAssistantsApi({
      history: Array.from({ length: 45 }, (_, index) => `Earlier ${index + 1}`),
      replies: [{ text: 'Latest reply.' }],
    })
    const { assistant, publicKey } = await createOpenaiAssistantsTestAssistant({
      openaiBaseUrl: fakeApi.baseURL,
    })
    const variables = { publicApiKey: publicKey, assistantId: assistant.id }

    renderWithSuperinterface({ variables, children: <Thread /> })
    await submitThreadMessage({ content: 'Hi' })
    await screen.findByText('Latest reply.', {}, { timeout: 15_000 })

    // Coming back to the conversation loads it page by page.
    cleanup()
    renderWithSuperinterface({ variables, children: <Thread /> })

    expect(
      await screen.findByText('Earlier 1', {}, { timeout: 15_000 }),
    ).toBeTruthy()
    expect(screen.getByText('Latest reply.')).toBeTruthy()

    // Nothing more is loaded once the oldest message is in.
    await new Promise((resolve) => setTimeout(resolve, 1_000))
    const pages = fakeApi
      .find({ method: 'GET', path: /^\/threads\/[^/]+\/messages$/ })
      .map(({ query }) => query.get('after'))
    expect(pages).toHaveLength(3)
    expect(pages[0]).toBeNull()
  }, 45_000)
})
