import { useMemo } from 'react'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'

type Status =
  | 'recording'
  | 'creatingMessage'
  | 'runActive'
  | 'playing'
  | 'loading'
  | 'idle'
  | 'recorderPaused'
  | 'playerPaused'
  | 'acquiringMedia'
  | 'other'

export const useStatus = () => {
  const { audioRuntime } = useAudioThreadContext()

  const status = useMemo((): Status => {
    if (audioRuntime.user.rawStatus === 'recording') return 'recording'
    if (audioRuntime.user.isPending) return 'creatingMessage'
    if (audioRuntime.assistant.paused || !audioRuntime.assistant.isAudioPlayed)
      return 'playerPaused'
    if (audioRuntime.assistant.playing || audioRuntime.assistant.isPending)
      return 'playing'
    if (audioRuntime.user.rawStatus === 'idle') return 'idle'
    if (audioRuntime.user.rawStatus === 'paused') return 'recorderPaused'

    return 'loading'
  }, [audioRuntime])

  return {
    status,
  }
}
