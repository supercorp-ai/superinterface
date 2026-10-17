import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { renderAssistantReply } from '../lib/renderAssistantReply'

// The page is embedded in an iframe: its window is not the top one. Set
// before Superinterface is imported, which is when it checks.
vi.hoisted(() => {
  Object.assign(window, { top: {} })
})

describe('in an iframe', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>

  afterEach(async () => {
    cleanup()
    await fakeLlm.close()
  })

  it('keeps the thread in local storage instead of a cookie', async () => {
    fakeLlm = await startFakeLlm({ replies: [{ content: 'Embedded.' }] })

    const { assistant } = await renderAssistantReply({
      llmBaseUrl: fakeLlm.baseURL,
      waitForText: 'Embedded.',
    })

    const key = `superinterface-${assistant.id}-threadId`
    expect(window.localStorage.getItem(key)).toMatch(/^[0-9a-f-]{36}$/)
    expect(document.cookie).not.toContain(key)
    expect(screen.getByText('Embedded.')).toBeTruthy()
  }, 30_000)
})
