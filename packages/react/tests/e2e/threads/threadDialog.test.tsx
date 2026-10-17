import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { ThreadDialog } from '@/components/threads/ThreadDialog'
import { ThreadDialogContext } from '@/contexts/threads/ThreadDialogContext'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { findMessageInput } from '../lib/threads/findMessageInput'
import { typeMessage } from '../lib/threads/typeMessage'

const PLACEHOLDER = 'Message E2E Assistant...'

describe('ThreadDialog', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>
  let variables: Record<string, unknown>

  beforeEach(async () => {
    fakeLlm = await startFakeLlm({
      replies: [{ content: 'Hello from the dialog.' }],
    })
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    variables = { publicApiKey: publicKey, assistantId: assistant.id }
  })

  afterEach(async () => {
    cleanup()
    await fakeLlm.close()
  })

  it('opens from the trigger, chats, and closes from the close button', async () => {
    const { container } = renderWithSuperinterface({
      variables,
      children: <ThreadDialog />,
    })

    expect(screen.queryByPlaceholderText(PLACEHOLDER)).toBeNull()
    const triggerButton = screen.getByRole('button')
    const trigger = triggerButton.parentElement!
    expect(trigger.className).toContain('rt-r-display-flex')

    fireEvent.click(triggerButton)

    const textarea = await findMessageInput()
    // On small screens the open dialog covers the trigger and shows its own
    // close button instead.
    expect(trigger.className).toContain('rt-r-display-none')
    expect(trigger.className).toContain('sm:rt-r-display-flex')

    expect(trigger.style.zIndex).toBe('9999999999')

    // The open dialog fills small screens; on larger ones it is a card of at
    // most 400x720px above the trigger, in front of the page.
    const card = container.querySelector<HTMLElement>('.rt-Card')!
    const dialog = card.parentElement!
    expect(dialog.className).toContain('sm:rt-r-max-h')
    expect(dialog.style.getPropertyValue('--max-height-sm')).toBe('720px')
    expect(dialog.className).toContain('sm:rt-r-max-w')
    expect(dialog.style.getPropertyValue('--max-width-sm')).toBe('400px')
    expect(dialog.style.zIndex).toBe('9999999999')
    expect(card.className).toContain('sm:rt-r-mb-3')
    expect(card.style.position).toBe('relative')
    expect(card.style.display).toBe('flex')
    expect(card.style.flexGrow).toBe('1')
    const inset = card.querySelector<HTMLElement>('.rt-Inset')!
    expect(inset.style.display).toBe('flex')
    expect(inset.style.flexGrow).toBe('1')
    const messagesList = inset.querySelector<HTMLElement>(
      '.rt-r-fd-column-reverse',
    )!
    expect(messagesList.style.paddingTop).toBe('var(--space-5)')
    expect(messagesList.style.paddingRight).toBe('var(--space-5)')
    expect(messagesList.style.paddingLeft).toBe('var(--space-5)')

    typeMessage({ textarea, text: 'Hi dialog' })
    expect(
      await screen.findByText(
        'Hello from the dialog.',
        {},
        { timeout: 15_000 },
      ),
    ).toBeTruthy()

    const close = container.querySelector('.rt-Card')!
      .lastElementChild as HTMLElement
    expect(close.className).toContain('rt-r-display-flex')
    expect(close.className).toContain('sm:rt-r-display-none')
    expect(close.style.zIndex).toBe('9999999999')

    fireEvent.click(close.querySelector('button')!)

    expect(screen.queryByPlaceholderText(PLACEHOLDER)).toBeNull()
    expect(screen.queryByText('Hello from the dialog.')).toBeNull()
    expect(trigger.className).toContain('rt-r-display-flex')

    fireEvent.click(triggerButton)
    expect(
      await screen.findByText(
        'Hello from the dialog.',
        {},
        { timeout: 15_000 },
      ),
    ).toBeTruthy()
  }, 30_000)

  it('composes a custom trigger and content, toggled by the same trigger', async () => {
    const { container } = renderWithSuperinterface({
      variables,
      children: (
        <ThreadDialog.Root>
          <ThreadDialog.Content
            className="custom-content"
            style={{ left: '10px' }}
          />
          <ThreadDialog.Trigger.Root
            className="custom-trigger"
            style={{ bottom: '48px' }}
          >
            <ThreadDialog.Trigger.Button />
            <span>Chat with us</span>
          </ThreadDialog.Trigger.Root>
        </ThreadDialog.Root>
      ),
    })

    const trigger = screen.getByText('Chat with us').parentElement!
    expect(trigger.className).toContain('custom-trigger')
    expect(trigger.style.bottom).toBe('48px')

    fireEvent.click(screen.getByText('Chat with us'))

    await findMessageInput()
    const content = container.querySelector<HTMLElement>('.custom-content')!
    expect(content.style.left).toBe('10px')

    fireEvent.click(screen.getByText('Chat with us'))
    expect(screen.queryByPlaceholderText(PLACEHOLDER)).toBeNull()
    expect(container.querySelector('.custom-content')).toBeNull()
  }, 30_000)

  it('starts open when the surrounding dialog context is open', async () => {
    renderWithSuperinterface({
      variables,
      children: (
        <ThreadDialogContext.Provider
          value={{ isOpen: true, setIsOpen: () => {} }}
        >
          <ThreadDialog />
        </ThreadDialogContext.Provider>
      ),
    })

    expect(await findMessageInput()).toBeTruthy()
  }, 30_000)

  it('does nothing when the trigger is used outside a dialog root', async () => {
    renderWithSuperinterface({
      variables,
      children: (
        <>
          <ThreadDialog.Trigger />
          <ThreadDialog.Content />
        </>
      ),
    })

    fireEvent.click(screen.getByRole('button'))

    expect(screen.queryByPlaceholderText(PLACEHOLDER)).toBeNull()
  }, 30_000)
})
