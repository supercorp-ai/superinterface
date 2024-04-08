import { useMemo } from 'react'
import { useCreateMessage } from '@/hooks/messages/useCreateMessage'
import { useRecorder } from '@/hooks/audioThreads/useRecorder'
import { useMessageAudio } from '@/hooks/audioThreads/useMessageAudio'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { statusMessages } from './lib/statusMessages'

type Args = {
  messageAudioProps: ReturnType<typeof useMessageAudio>
  recorderProps: ReturnType<typeof useRecorder>
  createMessageProps: ReturnType<typeof useCreateMessage>
}

export const useStatus = ({
  messageAudioProps,
  recorderProps,
  createMessageProps,
}: Args) => {
  const latestMessageProps = useLatestMessage()

  const status = useMemo((): keyof typeof statusMessages => {
    if (recorderProps.status === 'recording') return 'recording'
    if (createMessageProps.isPending) return 'creatingMessage'

    if (messageAudioProps.paused || !messageAudioProps.isAudioPlayed) return 'playerPaused'
    if (messageAudioProps.playing || messageAudioProps.isPending) return 'playing'
    if (!messageAudioProps.isAudioPlayed && !messageAudioProps.isReady) return 'loading'
    if (latestMessageProps.latestMessage?.status === 'in_progress') return 'creatingMessage'
    if (recorderProps.status === 'idle') return 'idle'
    if (recorderProps.status === 'paused') return 'recorderPaused'

    return 'loading'
  }, [
    latestMessageProps,
    messageAudioProps,
    recorderProps,
    createMessageProps,
  ])

  return {
    status,
  }
}
