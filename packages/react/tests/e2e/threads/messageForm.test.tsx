import { useState } from 'react'
import { createPortal } from 'react-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { Thread } from '@/components/threads/Thread'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { findMessageInput } from '../lib/threads/findMessageInput'
import { typeMessage } from '../lib/threads/typeMessage'
import { startHeldProxy } from '../lib/threads/startHeldProxy'
import { waitForPending } from '../lib/threads/waitForPending'
import { captureUnhandledRejections } from '../lib/threads/captureUnhandledRejections'

const REPLY = 'Hello from the fake model.'

const formButton = ({ textarea }: { textarea: HTMLElement }) =>
  textarea.closest('form')!.querySelector('button')!

const userContents = ({
  fakeLlm,
}: {
  fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>
}) =>
  fakeLlm
    .completionRequests()
    .map(({ body }) =>
      body.messages
        .filter(({ role }: { role: string }) => role === 'user')
        .map(({ content }: { content: string }) => content),
    )

describe('Thread.MessageForm', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>
  let llmProxy: Awaited<ReturnType<typeof startHeldProxy>>
  let setup: Awaited<ReturnType<typeof createTestAssistant>>
  let variables: Record<string, unknown>

  beforeEach(async () => {
    fakeLlm = await startFakeLlm({ replies: [{ content: REPLY }] })
    llmProxy = await startHeldProxy({ target: fakeLlm.baseURL })
    setup = await createTestAssistant({ llmBaseUrl: `${llmProxy.url}/v1` })
    variables = {
      publicApiKey: setup.publicKey,
      assistantId: setup.assistant.id,
    }
  })

  afterEach(async () => {
    cleanup()
    await llmProxy.close()
    await fakeLlm.close()
  })

  it('sends on Enter, but not on Shift+Enter or other keys', async () => {
    renderWithSuperinterface({ variables, children: <Thread /> })

    const textarea = (await findMessageInput()) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Typed with keys' } })

    // Other keys and Shift+Enter keep their default (a new line); a plain
    // Enter is prevented from adding one. fireEvent returns false when the
    // default was prevented.
    expect(fireEvent.keyDown(textarea, { key: 'a' })).toBe(true)
    expect(fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })).toBe(
      true,
    )
    expect(textarea.value).toBe('Typed with keys')
    expect(screen.queryByText('Typed with keys')).toBeNull()

    expect(fireEvent.keyDown(textarea, { key: 'Enter' })).toBe(false)

    expect(await screen.findByText('Typed with keys')).toBeTruthy()
    expect(await screen.findByText(REPLY, {}, { timeout: 15_000 })).toBeTruthy()
    expect(textarea.value).toBe('')
    expect(userContents({ fakeLlm })).toEqual([['Typed with keys']])
  }, 30_000)

  it('marks the field invalid and sends nothing when the message is empty', async () => {
    renderWithSuperinterface({ variables, children: <Thread /> })

    const textarea = await findMessageInput()
    const fieldBox = textarea.closest<HTMLElement>('[style*="border-style"]')!
    expect(fieldBox.style.borderColor).toBe('var(--gray-5)')

    fireEvent.submit(textarea.closest('form')!)

    await waitFor(() => expect(fieldBox.style.borderColor).toBe('var(--red-9)'))
    expect(fieldBox.style.backgroundColor).toBe('var(--red-2)')
    expect(fakeLlm.completionRequests()).toEqual([])
  }, 30_000)

  it('shows a stop button while the reply is pending and aborts the message request with its abort controller', async () => {
    llmProxy.hold({ path: '/chat/completions' })
    renderWithSuperinterface({ variables, children: <Thread /> })

    const textarea = (await findMessageInput()) as HTMLTextAreaElement
    expect(formButton({ textarea }).type).toBe('submit')

    typeMessage({ textarea, text: 'Please wait' })

    expect(await screen.findByText('Please wait')).toBeTruthy()
    await waitForPending({ proxy: llmProxy })
    await waitFor(() => expect(formButton({ textarea }).type).toBe('button'))

    // While the reply is pending, neither Enter nor submitting the form
    // sends another message.
    fireEvent.change(textarea, { target: { value: 'Too soon' } })
    // Enter still adds no new line.
    expect(fireEvent.keyDown(textarea, { key: 'Enter' })).toBe(false)
    fireEvent.submit(textarea.closest('form')!)
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(textarea.value).toBe('Too soon')
    expect(screen.queryByText('Too soon')).toBeNull()

    const unhandled = captureUnhandledRejections()
    fireEvent.click(formButton({ textarea }))

    await waitFor(() => expect(formButton({ textarea }).type).toBe('submit'))
    // BUG: the default onSubmit awaits createMessage without catching, so
    // the abort (already handled by onError) also escapes the form's submit
    // handler as an unhandled rejection.
    await waitFor(() => expect(unhandled.errors).toHaveLength(1))
    unhandled.restore()
    expect((unhandled.errors[0] as Error).name).toBe('AbortError')
    expect(screen.getByText('Please wait')).toBeTruthy()
    expect(screen.queryByText(REPLY)).toBeNull()
    expect(llmProxy.pendingCount()).toBe(1)
  }, 30_000)

  it('ignores the stop button while a custom submit has no request to abort', async () => {
    let finishSubmit = () => {}

    renderWithSuperinterface({
      variables,
      children: (
        <Thread.Root>
          <Thread.Messages />
          <Thread.MessageForm.Root
            onSubmit={() =>
              new Promise<void>((resolve) => {
                finishSubmit = resolve
              })
            }
          >
            <Thread.MessageForm.Field.Root>
              <Thread.MessageForm.Field.Control />
              <Thread.MessageForm.Submit />
            </Thread.MessageForm.Field.Root>
          </Thread.MessageForm.Root>
        </Thread.Root>
      ),
    })

    const textarea = await findMessageInput()
    typeMessage({ textarea, text: 'Handled elsewhere' })

    await waitFor(() => expect(formButton({ textarea }).type).toBe('button'))
    fireEvent.click(formButton({ textarea }))
    expect(formButton({ textarea }).type).toBe('button')

    finishSubmit()

    await waitFor(() => expect(formButton({ textarea }).type).toBe('submit'))
    expect(fakeLlm.completionRequests()).toEqual([])
  }, 30_000)

  it('passes reset, createMessage and files to a custom onSubmit', async () => {
    const submissions: Array<{ content: string; files: unknown[] }> = []

    renderWithSuperinterface({
      variables,
      children: (
        <Thread.Root>
          <Thread.Messages />
          <Thread.MessageForm.Root
            onSubmit={async ({ content, files, reset, createMessage }) => {
              submissions.push({ content, files })
              reset()
              await createMessage({ content: content.toUpperCase() })
            }}
          >
            <Thread.MessageForm.Field.Root>
              <Thread.MessageForm.Field.Control />
              <Thread.MessageForm.Submit />
            </Thread.MessageForm.Field.Root>
          </Thread.MessageForm.Root>
        </Thread.Root>
      ),
    })

    const textarea = (await findMessageInput()) as HTMLTextAreaElement
    typeMessage({ textarea, text: 'shout this' })

    expect(await screen.findByText('SHOUT THIS')).toBeTruthy()
    expect(await screen.findByText(REPLY, {}, { timeout: 15_000 })).toBeTruthy()
    expect(textarea.value).toBe('')
    expect(submissions).toEqual([{ content: 'shout this', files: [] }])
    expect(userContents({ fakeLlm })).toEqual([['SHOUT THIS']])
  }, 30_000)

  it('disables the form while isDisabled is set and, once enabled, focuses the textarea through its ref in an effect', async () => {
    const ToggleableForm = () => {
      const [isDisabled, setIsDisabled] = useState(true)

      return (
        <Thread.Root>
          <button onClick={() => setIsDisabled((prev) => !prev)}>
            Toggle form
          </button>
          <Thread.Messages />
          <Thread.MessageForm.Root isDisabled={isDisabled}>
            <Thread.MessageForm.Field.Root>
              <Thread.MessageForm.Field.Files.Control />
              <Thread.MessageForm.Field.Control />
              <Thread.MessageForm.Submit />
            </Thread.MessageForm.Field.Root>
          </Thread.MessageForm.Root>
        </Thread.Root>
      )
    }

    renderWithSuperinterface({ variables, children: <ToggleableForm /> })

    const textarea = (await findMessageInput()) as HTMLTextAreaElement
    const filesButton = textarea
      .closest('form')!
      .querySelector('input[type="file"]')!
      .closest('button')!
    const submitButton = textarea
      .closest('form')!
      .querySelector<HTMLButtonElement>('button[type="submit"]')!
    expect(textarea.disabled).toBe(true)
    expect(filesButton.disabled).toBe(true)
    expect(submitButton.disabled).toBe(true)

    fireEvent.change(textarea, { target: { value: 'Not allowed' } })
    fireEvent.submit(textarea.closest('form')!)
    fireEvent.keyDown(textarea, { key: 'Enter' })

    fireEvent.click(screen.getByText('Toggle form'))

    await waitFor(() => expect(document.activeElement).toBe(textarea))
    expect(textarea.disabled).toBe(false)
    expect(filesButton.disabled).toBe(false)
    expect(submitButton.disabled).toBe(false)
    expect(textarea.value).toBe('Not allowed')
    expect(fakeLlm.completionRequests()).toEqual([])
  }, 30_000)

  it('lets the input take a placeholder, class name and style', async () => {
    renderWithSuperinterface({
      variables,
      children: (
        <Thread.Root>
          <Thread.MessageForm.Root>
            <Thread.MessageForm.Field.Root>
              <Thread.MessageForm.Field.Control.Root>
                <Thread.MessageForm.Field.Control.Input
                  placeholder="Ask anything"
                  className="custom-input"
                  style={{ color: 'rebeccapurple' }}
                />
              </Thread.MessageForm.Field.Control.Root>
              <Thread.MessageForm.Submit.Root>
                <Thread.MessageForm.Submit.Button />
              </Thread.MessageForm.Submit.Root>
            </Thread.MessageForm.Field.Root>
          </Thread.MessageForm.Root>
        </Thread.Root>
      ),
    })

    const textarea = await findMessageInput({ placeholder: 'Ask anything' })
    expect(textarea.className).toContain('superinterface-textarea')
    expect(textarea.className).toContain('custom-input')
    expect(textarea.style.color).toBe('rebeccapurple')
    expect(textarea.style.resize).toBe('none')
  }, 30_000)

  it('does nothing on Enter when the input is rendered outside the form', async () => {
    const portalTarget = document.createElement('div')
    document.body.appendChild(portalTarget)

    renderWithSuperinterface({
      variables,
      children: (
        <Thread.Root>
          <Thread.MessageForm.Root>
            {createPortal(<Thread.MessageForm.Field.Control />, portalTarget)}
          </Thread.MessageForm.Root>
        </Thread.Root>
      ),
    })

    const textarea = (await findMessageInput()) as HTMLTextAreaElement
    expect(textarea.form).toBeNull()

    fireEvent.change(textarea, { target: { value: 'Nowhere to go' } })
    expect(fireEvent.keyDown(textarea, { key: 'Enter' })).toBe(false)

    expect(textarea.value).toBe('Nowhere to go')
    expect(fakeLlm.completionRequests()).toEqual([])
    portalTarget.remove()
  }, 30_000)
})
