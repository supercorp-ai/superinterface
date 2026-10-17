import assert from 'node:assert'
import { after, before, describe, it } from 'node:test'
import { ModelProviderType } from '@prisma/client'
import type { content as Content } from '../../../src/lib/messages/content'
import { startFakeOpenai } from '../openai/startFakeOpenai'

type ContentAssistant = Parameters<typeof Content>[0]['assistant']

// Loaded inside the tests, so the first test is the one that loads the
// message content modules.
const loadContent = async () =>
  (await import('../../../src/lib/messages/content')).content

const assistantWith = ({ apiKey }: { apiKey: string | null }) =>
  ({
    workspace: {
      modelProviders: [
        {
          id: 'model-provider-id',
          type: ModelProviderType.OPENAI,
          apiKey,
          endpoint: null,
          apiVersion: null,
        },
      ],
    },
  }) as unknown as ContentAssistant

const audioDataUrl = ({ payload }: { payload: string }) =>
  `data:audio/mp3;base64,${payload}`

describe('message content', () => {
  let fakeOpenai: Awaited<ReturnType<typeof startFakeOpenai>>

  before(async () => {
    fakeOpenai = await startFakeOpenai()
    process.env.OPENAI_BASE_URL = fakeOpenai.baseURL
  })

  after(async () => {
    await fakeOpenai.close()
  })

  const transcriptionRequests = () =>
    fakeOpenai.find({ method: 'POST', path: '/audio/transcriptions' })

  it('transcribes audio as an mp3 file with whisper-1, or stands in a dash for audio without a payload', async () => {
    const content = await loadContent()
    const assistant = assistantWith({ apiKey: 'test-key' })

    const transcript = await content({
      audioContent: audioDataUrl({
        payload: Buffer.from('spoken words').toString('base64'),
      }),
      assistant,
    })

    assert.strictEqual(transcript, 'Transcribed audio.')
    const [transcription] = transcriptionRequests()
    const body = String(transcription.body)
    assert.ok(body.includes('name="model"'))
    assert.ok(body.includes('whisper-1'))
    assert.ok(body.includes('filename="message.mp3"'))
    assert.ok(body.includes('spoken words'))

    for (const audioContent of [audioDataUrl({ payload: '' }), 'no-comma']) {
      assert.strictEqual(await content({ audioContent, assistant }), '-')
    }

    assert.strictEqual(transcriptionRequests().length, 1)
  })

  it('prefers the text sent over the audio', async () => {
    const content = await loadContent()

    const result = await content({
      textContent: 'Hello',
      audioContent: audioDataUrl({ payload: 'YXVkaW8=' }),
      assistant: assistantWith({ apiKey: 'test-key' }),
    })

    assert.strictEqual(result, 'Hello')
    assert.strictEqual(transcriptionRequests().length, 1)
  })

  it('needs an OpenAI API key to transcribe audio', async () => {
    const content = await loadContent()

    await assert.rejects(
      content({
        audioContent: audioDataUrl({ payload: 'YXVkaW8=' }),
        assistant: assistantWith({ apiKey: null }),
      }),
      { message: 'No OpenAI API key found' },
    )
  })

  it('needs text or audio', async () => {
    const content = await loadContent()

    await assert.rejects(
      content({ assistant: assistantWith({ apiKey: 'test-key' }) }),
      { message: 'No content found' },
    )
  })
})
