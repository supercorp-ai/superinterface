import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { Thread } from '@/components/threads/Thread'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { findMessageInput } from '../lib/threads/findMessageInput'
import { typeMessage } from '../lib/threads/typeMessage'

// The default thread id storage is picked once, when the library loads:
// localStorage inside an iframe (where third-party cookies are often
// blocked), cookies otherwise. jsdom's `top` can't be redefined, but `self`
// can, which is enough for `window.self !== window.top`.
vi.hoisted(() => {
  Object.defineProperty(window, 'self', {
    configurable: true,
    value: new Proxy(window, {}),
  })
})

describe('Thread inside an iframe', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>

  beforeEach(async () => {
    fakeLlm = await startFakeLlm({ replies: [{ content: 'Stored locally.' }] })
  })

  afterEach(async () => {
    cleanup()
    await fakeLlm.close()
  })

  it('keeps the thread id in localStorage instead of a cookie', async () => {
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    const variables = { publicApiKey: publicKey, assistantId: assistant.id }

    renderWithSuperinterface({ variables, children: <Thread /> })
    typeMessage({ textarea: await findMessageInput(), text: 'Remember me' })
    expect(
      await screen.findByText('Stored locally.', {}, { timeout: 15_000 }),
    ).toBeTruthy()

    const storedKeys = Object.keys(window.localStorage).filter((key) =>
      key.includes(assistant.id),
    )
    expect(storedKeys).toHaveLength(1)
    expect(window.localStorage.getItem(storedKeys[0])).toEqual(
      expect.any(String),
    )
    expect(document.cookie).not.toContain(assistant.id)

    cleanup()
    renderWithSuperinterface({ variables, children: <Thread /> })

    expect(
      await screen.findByText('Stored locally.', {}, { timeout: 15_000 }),
    ).toBeTruthy()
    expect(screen.getByText('Remember me')).toBeTruthy()
  }, 30_000)
})
