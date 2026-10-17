import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { File as NodeFile } from 'node:buffer'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { Thread } from '@/components/threads/Thread'
import { useCreateFile } from '@/hooks/files/useCreateFile'
import { useChangeFilesField } from '@/hooks/files/useChangeFilesField'
import { createOpenaiAssistantsTestAssistant } from '../lib/createOpenaiAssistantsTestAssistant'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { startFakeAssistantsApi } from '../lib/startFakeAssistantsApi'
import { submitThreadMessage } from '../lib/submitThreadMessage'
import { swapInNodeFormData } from '../lib/swapInNodeFormData'
import { captureUnhandledRejections } from '../lib/captureUnhandledRejections'

// A custom upload button, built on useCreateFile the way an app would.
const Uploader = ({
  options,
}: {
  options?: Parameters<typeof useCreateFile>[0]
}) => {
  const { createFile } = useCreateFile(options)
  const [result, setResult] = useState('')

  return (
    <>
      <input
        type="file"
        aria-label="Upload"
        onChange={async (event) => {
          try {
            const response = await createFile({
              file: event.target.files![0],
              purpose: 'assistants',
            })
            setResult(JSON.stringify(response))
          } catch (error) {
            setResult(`failed: ${(error as Error).name}`)
          }
        }}
      />
      <output aria-label="Upload result">{result}</output>
    </>
  )
}

// The thread's file button on its own, outside any message form, next to an
// app's text field that (by mistake) shares the files change handler.
const FilesControlWithoutForm = () => {
  const { changeFilesField } = useChangeFilesField()

  return (
    <>
      <Thread.MessageForm.Field.Files.Control />
      <input
        aria-label="Notes"
        onChange={changeFilesField}
      />
    </>
  )
}

// Uploads whatever the app passes to createFile, here nothing at all.
const EmptyUploader = () => {
  const { createFile } = useCreateFile()
  const [result, setResult] = useState('')

  return (
    <>
      <button
        type="button"
        onClick={async () => setResult(JSON.stringify(await createFile({})))}
      >
        Upload nothing
      </button>
      <output aria-label="Upload result">{result}</output>
    </>
  )
}

const ThreadWithFiles = () => (
  <Thread.Root>
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

describe('file uploads', () => {
  let fakeApi: Awaited<ReturnType<typeof startFakeAssistantsApi>>
  let restoreFormData: () => void

  beforeEach(async () => {
    restoreFormData = await swapInNodeFormData()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    cleanup()
    restoreFormData()
    await fakeApi.close()
  })

  const renderThread = async ({
    handle,
  }: {
    handle?: Parameters<typeof startFakeAssistantsApi>[0]['handle']
  } = {}) => {
    fakeApi = await startFakeAssistantsApi({
      replies: [{ text: 'Got your files.' }],
      handle,
    })
    const { assistant, publicKey } = await createOpenaiAssistantsTestAssistant({
      openaiBaseUrl: fakeApi.baseURL,
    })

    const rendered = renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: <ThreadWithFiles />,
    })

    const input = (await waitFor(
      () => rendered.container.querySelector('input[type="file"]')!,
      { timeout: 15_000 },
    )) as HTMLInputElement

    return { input, assistant }
  }

  const upload = ({
    input,
    files,
  }: {
    input: HTMLInputElement
    files: NodeFile[]
  }) => fireEvent.change(input, { target: { files } })

  const uploads = () =>
    fakeApi.find({ method: 'POST', path: '/files' }).map(({ body }) => body)

  it('uploads documents and images, then sends them with the message', async () => {
    const { input } = await renderThread()

    // Closing the file picker without choosing selects nothing.
    upload({ input, files: [] })

    upload({
      input,
      files: [
        new NodeFile(['region,total\neu,10'], 'report.csv', {
          type: 'text/csv',
        }),
        new NodeFile(['png-bytes'], 'chart.png', { type: 'image/png' }),
      ],
    })

    // Both show while they upload, then once they are stored.
    expect(await screen.findByText('report.csv')).toBeTruthy()
    expect(screen.getByText('chart.png')).toBeTruthy()
    await waitFor(() => expect(uploads()).toHaveLength(2), {
      timeout: 15_000,
    })
    expect(uploads()[0]).toContain('filename="report.csv"')
    expect(uploads()[0]).toMatch(/name="purpose"\r\n\r\nassistants/)
    expect(uploads()[1]).toContain('filename="chart.png"')
    expect(uploads()[1]).toMatch(/name="purpose"\r\n\r\nvision/)

    // Once uploaded, the files can be sent.
    const submit = screen
      .getAllByRole('button')
      .find((button) => button.getAttribute('type') === 'submit')!
    await waitFor(() => expect(submit.hasAttribute('disabled')).toBe(false), {
      timeout: 15_000,
    })

    await submitThreadMessage({ content: 'Summarize these' })
    await screen.findByText('Got your files.', {}, { timeout: 15_000 })

    const [messageCreate] = fakeApi.find({
      method: 'POST',
      path: /^\/threads\/[^/]+\/messages$/,
    })
    expect(messageCreate.body.content).toEqual([
      { type: 'image_file', image_file: { file_id: 'file-2' } },
      { type: 'text', text: 'Summarize these' },
    ])
    expect(messageCreate.body.attachments).toEqual([
      { file_id: 'file-1', tools: [{ type: 'file_search' }] },
    ])
    // The sent files are cleared from the form.
    expect(screen.queryByText('report.csv')).toBeNull()
  }, 45_000)

  it('sends uploads to the thread the conversation is stored in', async () => {
    const { input, assistant } = await renderThread()

    await submitThreadMessage({ content: 'Hi' })
    await screen.findByText('Got your files.', {}, { timeout: 15_000 })

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    upload({
      input,
      files: [new NodeFile(['notes'], 'notes.txt', { type: 'text/plain' })],
    })
    await waitFor(() => expect(uploads()).toHaveLength(1), {
      timeout: 15_000,
    })

    const [, init] = fetchSpy.mock.calls.find(([url]) =>
      String(url).endsWith('/files'),
    )!
    const threadId = document.cookie.match(
      new RegExp(`superinterface-${assistant.id}-threadId=([^;]+)`),
    )![1]
    expect((init!.body as FormData).get('threadId')).toBe(threadId)
    expect((init!.body as FormData).get('purpose')).toBe('assistants')
  }, 45_000)

  // BUG: a failed upload shows a toast and drops the file, but the rejected
  // upload is not caught, so the change handler rejects unhandled.
  it('BUG: drops a file that fails to upload and rejects unhandled', async () => {
    const { input } = await renderThread({
      handle: ({ request }) =>
        request.method === 'POST' && request.path === '/files'
          ? { type: 'json', status: 400, json: { error: { message: 'Nope' } } }
          : undefined,
    })

    const rejections = captureUnhandledRejections()

    try {
      upload({
        input,
        files: [new NodeFile(['notes'], 'notes.txt', { type: 'text/plain' })],
      })

      expect(await screen.findByText('notes.txt')).toBeTruthy()
      expect(
        await screen.findByText(
          'Could not upload file. Please try again.',
          {},
          { timeout: 15_000 },
        ),
      ).toBeTruthy()
      await waitFor(() => expect(screen.queryByText('notes.txt')).toBeNull())
      await waitFor(() => expect(rejections.reasons).toHaveLength(1))
      expect(rejections.reasons[0]).toBeInstanceOf(SyntaxError)
    } finally {
      rejections.restore()
    }
  }, 45_000)

  const renderUploader = async ({
    variables,
    options,
    handle,
  }: {
    variables: (args: {
      assistantId: string
      publicKey: string
    }) => Record<string, unknown>
    options?: Parameters<typeof useCreateFile>[0]
    handle?: Parameters<typeof startFakeAssistantsApi>[0]['handle']
  }) => {
    fakeApi = await startFakeAssistantsApi({ replies: [], handle })
    const { assistant, publicKey } = await createOpenaiAssistantsTestAssistant({
      openaiBaseUrl: fakeApi.baseURL,
    })

    renderWithSuperinterface({
      variables: variables({ assistantId: assistant.id, publicKey }),
      children: <Uploader options={options} />,
    })

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    upload({
      input: screen.getByLabelText('Upload') as HTMLInputElement,
      files: [new NodeFile(['notes'], 'notes.txt', { type: 'text/plain' })],
    })

    const result = await waitFor(
      () => {
        const text = screen.getByRole('status', {
          name: 'Upload result',
        }).textContent
        expect(text).toBeTruthy()
        return text!
      },
      { timeout: 15_000 },
    )
    const [, init] = fetchSpy.mock.calls.find(([url]) =>
      String(url).endsWith('/files'),
    )!

    return { result, sent: init!.body as FormData }
  }

  it('uploads with useCreateFile to the thread the app chose', async () => {
    const { result, sent } = await renderUploader({
      variables: ({ assistantId, publicKey }) => ({
        publicApiKey: publicKey,
        assistantId,
        threadId: 'thread-chosen-by-app',
      }),
      options: {},
    })

    expect(JSON.parse(result).file).toMatchObject({
      filename: 'notes.txt',
      purpose: 'assistants',
    })
    expect(sent.get('threadId')).toBe('thread-chosen-by-app')
  }, 30_000)

  it('calls onError when an upload fails', async () => {
    const errors: unknown[] = []
    const { result } = await renderUploader({
      variables: ({ assistantId, publicKey }) => ({
        publicApiKey: publicKey,
        assistantId,
      }),
      options: { onError: (error) => errors.push(error) },
      handle: ({ request }) =>
        request.method === 'POST' && request.path === '/files'
          ? { type: 'json', status: 400, json: { error: { message: 'Nope' } } }
          : undefined,
    })

    expect(result).toBe('failed: SyntaxError')
    expect(errors).toHaveLength(1)
  }, 30_000)

  it('rejects a failed upload without onError', async () => {
    const { result } = await renderUploader({
      variables: ({ assistantId, publicKey }) => ({
        publicApiKey: publicKey,
        assistantId,
      }),
      options: {},
      handle: ({ request }) =>
        request.method === 'POST' && request.path === '/files'
          ? { type: 'destroy' }
          : undefined,
    })

    expect(result).toBe('failed: SyntaxError')
  }, 30_000)

  it('uploads from the files button outside a message form', async () => {
    fakeApi = await startFakeAssistantsApi({ replies: [] })
    const { assistant, publicKey } = await createOpenaiAssistantsTestAssistant({
      openaiBaseUrl: fakeApi.baseURL,
    })

    const { container } = renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: <FilesControlWithoutForm />,
    })

    // A change without files, as from a text field, uploads nothing.
    fireEvent.change(screen.getByLabelText('Notes'), {
      target: { value: 'not a file' },
    })

    // There is no form to list the file in, but it is still uploaded.
    upload({
      input: container.querySelector('input[type="file"]') as HTMLInputElement,
      files: [new NodeFile(['notes'], 'notes.txt', { type: 'text/plain' })],
    })
    await waitFor(() => expect(uploads()).toHaveLength(1), {
      timeout: 15_000,
    })
    expect(uploads()[0]).toContain('filename="notes.txt"')
    expect(screen.queryByText('notes.txt')).toBeNull()
    expect(
      screen.queryByText('Could not upload file. Please try again.'),
    ).toBeNull()
  }, 30_000)

  it('uploads an empty form when the app passes nothing', async () => {
    fakeApi = await startFakeAssistantsApi({ replies: [] })

    // An app without provider variables.
    renderWithSuperinterface({
      variables: {},
      children: <EmptyUploader />,
    })

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fireEvent.click(screen.getByText('Upload nothing'))

    // BUG: the server's rejection resolves the upload, see below.
    await waitFor(
      () =>
        expect(
          screen.getByRole('status', { name: 'Upload result' }).textContent,
        ).toBe(JSON.stringify({ error: 'Invalid assistantId' })),
      { timeout: 15_000 },
    )
    const [, init] = fetchSpy.mock.calls.find(([url]) =>
      String(url).endsWith('/files'),
    )!
    expect([...(init!.body as FormData).keys()]).toEqual([])
    expect(uploads()).toEqual([])
  }, 30_000)

  // BUG: useCreateFile does not check the response status, so an upload the
  // server rejects (here: no assistant to store it for) resolves with the
  // error body as if it was uploaded. useChangeFilesField then adds an
  // undefined file to the form.
  it('BUG: resolves an upload the server rejected', async () => {
    const { result, sent } = await renderUploader({
      variables: ({ publicKey }) => ({ publicApiKey: publicKey }),
    })

    expect(sent.get('assistantId')).toBeNull()
    expect(JSON.parse(result)).toEqual({ error: 'Invalid assistantId' })
  }, 30_000)
})
