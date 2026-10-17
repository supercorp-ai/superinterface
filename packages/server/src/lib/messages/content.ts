import type { Prisma } from '@prisma/client'
import { isEmpty } from 'radash'
import { openaiModelProvider } from './openaiModelProvider'
import { dataUrlBase64 } from './dataUrlBase64'
import { transcribeAudio } from './transcribeAudio'

// Stands in for the transcript of audio with no payload.
const EMPTY_AUDIO_TRANSCRIPT = '-'

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
  if (textContent) return textContent

  if (!audioContent) throw new Error('No content found')

  const modelProvider = openaiModelProvider({
    modelProviders: assistant.workspace.modelProviders,
  })

  const base64Audio = dataUrlBase64({ dataUrl: audioContent })

  if (isEmpty(base64Audio)) return EMPTY_AUDIO_TRANSCRIPT

  return transcribeAudio({ modelProvider, base64Audio })
}
