import { useMemo } from 'react'
import { useCreateMessage } from '@/hooks/messages/useCreateMessage'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'
import { useRecorder } from '@/hooks/audioThreads/useRecorder'
import { useMessageAudio } from '@/hooks/audioThreads/useMessageAudio'
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
  const isRunActiveProps = useIsRunActive()

  const status = useMemo((): keyof typeof statusMessages => {
    if (recorderProps.status === 'recording') return 'recording'
    if (createMessageProps.isPending) return 'creatingMessage'
    if (isRunActiveProps.isRunActive) return 'runActive'

    if (messageAudioProps.playing) return 'playing'
    if (messageAudioProps.paused) return 'playerPaused'
    if (!messageAudioProps.isReady) return 'loading'
    if (recorderProps.status === 'idle') return 'idle'
    if (recorderProps.status === 'paused') return 'recorderPaused'

    return 'loading'
  }, [
    messageAudioProps,
    recorderProps,
    createMessageProps,
    isRunActiveProps,
  ])

  return {
    status,
  }
}
