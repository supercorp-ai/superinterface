import { ModelProviderType, Prisma } from '@prisma/client'
import { toFile } from 'openai'
import { buildOpenaiClient } from '@/lib/modelProviders/buildOpenaiClient'
import { isEmpty } from 'radash'

type Args = {
  textContent?: string
  audioContent?: string
  assistant: Prisma.AssistantGetPayload<{
    include: {
      workspace: {
        include: {
          modelProviders: true
        }
      }
    }
  }>
}

export const content = async ({
  textContent,
  audioContent,
  assistant,
}: Args) => {
  if (textContent) {
    return textContent
  }

  if (audioContent) {
    const openaiModelProvider = assistant.workspace.modelProviders.find(
      (mp) => mp.type === ModelProviderType.OPENAI,
    )

    if (!openaiModelProvider?.apiKey) {
      throw new Error('No OpenAI API key found')
    }

    const client = buildOpenaiClient({
      modelProvider: openaiModelProvider,
    })

    const base64Content = audioContent.split(',')[1]

    if (isEmpty(base64Content)) {
      return '-'
    }

    const audioBuffer = Buffer.from(base64Content, 'base64')
    const file = await toFile(audioBuffer, 'message.mp3')

    const transcription = await client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
    })

    return transcription.text
  }

  throw new Error('No content found')
}
