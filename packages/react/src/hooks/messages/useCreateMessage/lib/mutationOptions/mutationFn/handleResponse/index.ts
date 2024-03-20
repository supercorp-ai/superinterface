import OpenAI from 'openai'
import {
  useQueryClient,
} from '@tanstack/react-query'
import { AudioStreamEvent } from '@/types'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import { handlers } from './handlers'

let binaryData: number[] = []

export const handleResponse = ({
  value,
  messagesQueryKey,
  queryClient,
  audioThreadContext,
}: {
  value: {
    value: OpenAI.Beta.Assistants.AssistantStreamEvent | AudioStreamEvent
  }
  messagesQueryKey: (string | Record<string, any>)[]
  queryClient: ReturnType<typeof useQueryClient>
  audioThreadContext: ReturnType<typeof useAudioThreadContext>
}) => {
  if (value.value.event === 'audio.delta') {
    // @ts-ignore-next-line
    audioThreadContext.setAudioStreamEvents((prev: AudioStreamEvent[]) => (
      [...prev, value.value as AudioStreamEvent]
    ))

    return
  }

  if (value.value.event === 'audio.completed') {
    // @ts-ignore-next-line
    audioThreadContext.setAudioStreamEvents((prev: AudioStreamEvent[]) => (
      [...prev, value.value as AudioStreamEvent]
    ))

    return
  }

  // @ts-ignore-next-line
  const handler = handlers[value.value.event]

  if (!handler) {
    return console.log('Missing handler', { value })
  }

  return queryClient.setQueryData(
    messagesQueryKey,
    handler({ value: value.value })
  )
}
