import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { Thread } from '@/components/threads/Thread'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'

describe('Thread', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>

  beforeEach(async () => {
    fakeLlm = await startFakeLlm({
      replies: [{ content: 'Hello from the fake model.' }],
    })
  })

  afterEach(async () => {
    cleanup()
    await fakeLlm.close()
  })

  it('sends a message and streams the assistant reply', async () => {
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })

    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: <Thread />,
    })

    const textarea = await screen.findByPlaceholderText(
      'Message E2E Assistant...',
      {},
      { timeout: 15_000 },
    )
    fireEvent.change(textarea, { target: { value: 'Hi there' } })
    fireEvent.submit(textarea.closest('form')!)

    expect(await screen.findByText('Hi there')).toBeTruthy()
    expect(
      await screen.findByText(
        'Hello from the fake model.',
        {},
        { timeout: 15_000 },
      ),
    ).toBeTruthy()

    const [completionRequest] = fakeLlm.completionRequests()
    expect(
      completionRequest.body.messages.map(
        ({ role, content }: { role: string; content: string }) => ({
          role,
          content,
        }),
      ),
    ).toEqual([{ role: 'user', content: 'Hi there' }])
  }, 30_000)
})
