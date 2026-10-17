import { toFile } from 'openai'
import type { ModelProvider } from '@prisma/client'
import { buildOpenaiClient } from '@/lib/modelProviders/buildOpenaiClient'

const AUDIO_FILE_NAME = 'message.mp3'
const TRANSCRIPTION_MODEL = 'whisper-1'

// Transcribes base64 encoded audio with the OpenAI model provider.
export const transcribeAudio = async ({
  modelProvider,
  base64Audio,
}: {
  modelProvider: ModelProvider
  base64Audio: string
}) => {
  const { audio } = buildOpenaiClient({ modelProvider })

  const transcription = await audio.transcriptions.create({
    file: await toFile(Buffer.from(base64Audio, 'base64'), AUDIO_FILE_NAME),
    model: TRANSCRIPTION_MODEL,
  })

  return transcription.text
}
