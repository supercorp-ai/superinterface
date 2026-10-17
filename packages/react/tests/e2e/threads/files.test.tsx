import { afterEach, beforeEach, describe, expect, inject, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { Thread } from '@/components/threads/Thread'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { findMessageInput } from '../lib/threads/findMessageInput'
import { typeMessage } from '../lib/threads/typeMessage'
import { startHeldProxy } from '../lib/threads/startHeldProxy'
import { waitForPending } from '../lib/threads/waitForPending'
import { stubNodeFormData } from '../lib/threads/stubNodeFormData'
import { fakeFileUpload } from '../lib/threads/fakeFileUpload'
import { captureUnhandledRejections } from '../lib/threads/captureUnhandledRejections'

const ThreadWithFiles = ({ baseUrl }: { baseUrl?: string }) => (
  <Thread.Root {...(baseUrl ? { baseUrl } : {})}>
    <Thread.Messages />
    <Thread.MessageForm.Root>
      <Thread.MessageForm.Field.Root>
        <Thread.MessageForm.Field.Files.Preview />
        <Thread.MessageForm.Field.Files.Control />
        <Thread.MessageForm.Field.Control />
        <Thread.MessageForm.Submit />
      </Thread.MessageForm.Field.Root>
    </Thread.MessageForm.Root>
  </Thread.Root>
)

const fileInput = () =>
  document.querySelector<HTMLInputElement>('input[type="file"]')!

const filePreview = ({ filename }: { filename: string }) =>
  screen.getByText(filename).closest<HTMLElement>('.rt-Card')!

const submitButton = () =>
  document.querySelector<HTMLButtonElement>('button[type="submit"]')!

describe('Thread.MessageForm files', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>
  let serverProxy: Awaited<ReturnType<typeof startHeldProxy>>
  let setup: Awaited<ReturnType<typeof createTestAssistant>>
  let File: Awaited<ReturnType<typeof stubNodeFormData>>['File']

  beforeEach(async () => {
    ;({ File } = await stubNodeFormData())
    fakeLlm = await startFakeLlm({ replies: [{ content: 'Got your files.' }] })
    serverProxy = await startHeldProxy({ target: inject('testServer').baseUrl })
    setup = await createTestAssistant({ llmBaseUrl: fakeLlm.baseURL })
  })

  afterEach(async () => {
    cleanup()
    vi.unstubAllGlobals()
    await serverProxy.close()
    await fakeLlm.close()
  })

  it('uploads files, each with a spinner until it has a server id, lets the user remove one, and sends the rest with the message', async () => {
    serverProxy.respond({ path: '/api/files', handle: fakeFileUpload })
    serverProxy.hold({ path: '/api/files' })

    renderWithSuperinterface({
      variables: {
        publicApiKey: setup.publicKey,
        assistantId: setup.assistant.id,
      },
      children: <ThreadWithFiles baseUrl={`${serverProxy.url}/api`} />,
    })

    const textarea = await findMessageInput()
    expect(screen.queryByText('notes.txt')).toBeNull()
    // The file input is an invisible layer clipped to the files button, so a
    // click anywhere on the button opens the file picker.
    const filesButton = fileInput().closest('button')!
    expect(filesButton.style.position).toBe('relative')
    expect(filesButton.style.overflow).toBe('hidden')
    expect(fileInput().style.position).toBe('absolute')
    expect(fileInput().style.opacity).toBe('0')

    fireEvent.change(fileInput(), {
      target: {
        files: [
          new File(['some notes'], 'notes.txt', { type: 'text/plain' }),
          new File(['png bytes'], 'photo.png', { type: 'image/png' }),
          new File(['not needed'], 'extra.txt', { type: 'text/plain' }),
        ],
      },
    })

    // Each file shows a spinner until its upload finishes, and the message
    // can't be sent meanwhile.
    expect(screen.getByText('notes.txt')).toBeTruthy()
    expect(document.querySelectorAll('.rt-Card .rt-Spinner')).toHaveLength(3)
    expect(submitButton().disabled).toBe(true)

    await waitForPending({ proxy: serverProxy })
    typeMessage({ textarea, text: 'Too early' })
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(
      serverProxy.requests.filter(
        ({ method, path }) => method === 'POST' && path === '/api/messages',
      ),
    ).toEqual([])

    serverProxy.release()

    // Uploaded files get their server ids, so each spinner is told it is no
    // longer loading (Radix's Spinner shows unless `loading` is false).
    await waitFor(() =>
      expect(document.querySelectorAll('.rt-Card .rt-Spinner')).toHaveLength(0),
    )
    // Each card now shows its file icon and its remove button's icon.
    expect(document.querySelectorAll('.rt-Card svg')).toHaveLength(6)
    expect(submitButton().disabled).toBe(false)
    expect(
      serverProxy.requests.filter(({ path }) => path === '/api/files'),
    ).toHaveLength(3)

    // BUG: the remove button has no type, so it is a submit button and
    // removing a file also submits the form. With an empty field, that
    // marks the field invalid.
    fireEvent.change(textarea, { target: { value: '' } })
    fireEvent.click(
      filePreview({ filename: 'extra.txt' }).querySelector('button')!,
    )
    expect(screen.queryByText('extra.txt')).toBeNull()
    await waitFor(() =>
      expect(
        textarea.closest<HTMLElement>('[style*="border-style"]')!.style
          .borderColor,
      ).toBe('var(--red-9)'),
    )

    serverProxy.hold({ path: '/api/messages', method: 'POST' })
    typeMessage({ textarea, text: 'See attached' })

    // While the message is sending, no more files can be added, and the
    // sent files have left the form.
    await waitFor(() =>
      expect(fileInput().closest('button')!.disabled).toBe(true),
    )
    expect(screen.queryByText('notes.txt')).toBeNull()

    await waitForPending({ proxy: serverProxy })
    const messageRequests = serverProxy.requests.filter(
      ({ method, path }) => method === 'POST' && path === '/api/messages',
    )
    expect(messageRequests).toHaveLength(1)
    expect(JSON.parse(messageRequests[0].body.toString())).toEqual({
      publicApiKey: setup.publicKey,
      assistantId: setup.assistant.id,
      content: [
        { type: 'image_file', image_file: { file_id: 'file-photo.png' } },
        { type: 'text', text: 'See attached' },
      ],
      attachments: [
        { file_id: 'file-notes.txt', tools: [{ type: 'file_search' }] },
      ],
    })

    // The e2e server never stored these files, so the run fails.
    const unhandled = captureUnhandledRejections()
    serverProxy.release()

    expect(
      await screen.findByText(
        'Failed to send your message, try again. If you are the owner, check the logs.',
        {},
        { timeout: 15_000 },
      ),
    ).toBeTruthy()
    await waitFor(() => expect(unhandled.errors).toHaveLength(1))
    unhandled.restore()
    expect(fileInput().closest('button')!.disabled).toBe(false)
  }, 30_000)

  it('drops a file whose upload fails and tells the user', async () => {
    renderWithSuperinterface({
      variables: {
        publicApiKey: setup.publicKey,
        assistantId: setup.assistant.id,
      },
      children: <ThreadWithFiles />,
    })

    await findMessageInput()
    const unhandled = captureUnhandledRejections()
    fireEvent.change(fileInput(), {
      target: {
        files: [new File(['some notes'], 'notes.txt', { type: 'text/plain' })],
      },
    })
    expect(screen.getByText('notes.txt')).toBeTruthy()

    expect(
      await screen.findByText(
        'Could not upload file. Please try again.',
        {},
        { timeout: 15_000 },
      ),
    ).toBeTruthy()
    expect(screen.queryByText('notes.txt')).toBeNull()
    expect(submitButton().disabled).toBe(false)

    // BUG: the server answers the failed upload with an empty 500, and the
    // change handler awaits createFile without catching, so besides the
    // toast the JSON parse error escapes as an unhandled rejection.
    await waitFor(() => expect(unhandled.errors).toHaveLength(1))
    unhandled.restore()
    expect((unhandled.errors[0] as Error).name).toBe('SyntaxError')
  }, 30_000)
})
