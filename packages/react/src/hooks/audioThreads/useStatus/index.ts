import { useMemo } from 'react'
import { useCreateThreadMessage } from '@/hooks/threadMessages/useCreateThreadMessage'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'
import { useRecorder } from '@/hooks/audioThreads/useRecorder'
import { useMessageAudio } from '@/hooks/audioThreads/useMessageAudio'
import { statusMessages } from './lib/statusMessages'

type Args = {
  messageAudioProps: ReturnType<typeof useMessageAudio>
  recorderProps: ReturnType<typeof useRecorder>
  createThreadMessageProps: ReturnType<typeof useCreateThreadMessage>
}

export const useStatus = ({
  messageAudioProps,
  recorderProps,
  createThreadMessageProps,
}: Args) => {
  const isRunActiveProps = useIsRunActive()

  const status = useMemo((): keyof typeof statusMessages => {
    if (recorderProps.status === 'recording') return 'recording'
    if (createThreadMessageProps.isPending) return 'creatingMessage'
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
    createThreadMessageProps,
    isRunActiveProps,
  ])

  return {
    status,
  }
}
