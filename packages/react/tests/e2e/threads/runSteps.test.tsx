import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { Thread } from '@/components/threads/Thread'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { findMessageInput } from '../lib/threads/findMessageInput'
import { typeMessage } from '../lib/threads/typeMessage'
import { createRequestFunction } from '../lib/threads/createRequestFunction'
import { startHeldProxy } from '../lib/threads/startHeldProxy'
import { waitForPending } from '../lib/threads/waitForPending'

describe('Thread.Message run steps', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>
  let llmProxy: Awaited<ReturnType<typeof startHeldProxy>>
  let setup: Awaited<ReturnType<typeof createTestAssistant>>

  beforeEach(async () => {
    fakeLlm = await startFakeLlm({
      replies: [
        { toolCalls: [{ name: 'lookup_weather' }] },
        { content: 'It is sunny.' },
      ],
    })
    llmProxy = await startHeldProxy({ target: fakeLlm.baseURL })
    setup = await createTestAssistant({ llmBaseUrl: `${llmProxy.url}/v1` })
    await createRequestFunction({
      privateKey: setup.privateKey,
      assistantId: setup.assistant.id,
      name: 'lookup_weather',
      url: `${fakeLlm.baseURL}/models`,
    })
  })

  afterEach(async () => {
    cleanup()
    await llmProxy.close()
    await fakeLlm.close()
  })

  it('shows a server function call once, between the question and the reply', async () => {
    const variables = {
      publicApiKey: setup.publicKey,
      assistantId: setup.assistant.id,
    }

    // Hold the end of the model's answer to the tool output.
    llmProxy.hold({
      path: '/chat/completions',
      when: ({ request }) => request.body.toString().includes('"role":"tool"'),
      midStream: true,
    })
    renderWithSuperinterface({ variables, children: <Thread /> })

    const textarea = await findMessageInput()
    typeMessage({ textarea, text: 'Weather?' })

    // The reply streams in after the finished call while the run goes on.
    await waitForPending({ proxy: llmProxy })
    expect(
      await screen.findByText('It is sunny.', {}, { timeout: 15_000 }),
    ).toBeTruthy()
    expect(screen.getAllByText('Finished lookup_weather')).toHaveLength(1)
    // Tool calls show as small gold outline buttons without a shadow.
    const toolCallButton = screen
      .getByText('Finished lookup_weather')
      .closest('button')!
    expect(toolCallButton.dataset.accentColor).toBe('gold')
    expect(toolCallButton.style.boxShadow).toBe('none')
    expect(textarea.closest('form')!.querySelector('button')!.type).toBe(
      'button',
    )

    llmProxy.release()
    await waitFor(() =>
      expect(textarea.closest('form')!.querySelector('button')!.type).toBe(
        'submit',
      ),
    )
    expect(screen.getAllByText('Finished lookup_weather')).toHaveLength(1)

    const toolOutput = fakeLlm
      .completionRequests()[1]
      .body.messages.find(({ role }: { role: string }) => role === 'tool')
    expect(JSON.parse(toolOutput.content).data[0].id).toBe('fake-model')

    // Reloaded from the server, the call still shows once, before the reply.
    cleanup()
    const { container } = renderWithSuperinterface({
      variables,
      children: <Thread />,
    })

    expect(
      await screen.findByText('It is sunny.', {}, { timeout: 15_000 }),
    ).toBeTruthy()
    expect(screen.getAllByText('Finished lookup_weather')).toHaveLength(1)

    // Messages render newest first inside column-reverse lists, so the DOM
    // order is the reverse of what the user sees.
    const text = container.textContent!
    expect(text.indexOf('It is sunny.')).toBeLessThan(
      text.indexOf('Finished lookup_weather'),
    )
    expect(text.indexOf('Finished lookup_weather')).toBeLessThan(
      text.indexOf('Weather?'),
    )
  }, 30_000)
})
