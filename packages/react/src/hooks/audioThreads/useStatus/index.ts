import { useMemo } from 'react'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import { statusMessages } from './lib/statusMessages'

export const useStatus = () => {
  const { audioRuntime } = useAudioThreadContext()

  const status = useMemo((): keyof typeof statusMessages => {
    if (audioRuntime.user.rawStatus === 'recording') return 'recording'
    if (audioRuntime.user.isPending) return 'creatingMessage'
    if (audioRuntime.assistant.paused || !audioRuntime.assistant.isAudioPlayed) return 'playerPaused'
    if (audioRuntime.assistant.playing || audioRuntime.assistant.isPending) return 'playing'
    if (!audioRuntime.assistant.isAudioPlayed && !audioRuntime.assistant.isReady) return 'loading'
    if (audioRuntime.user.rawStatus === 'idle') return 'idle'
    if (audioRuntime.user.rawStatus === 'paused') return 'recorderPaused'

    return 'loading'
  }, [
    audioRuntime,
  ])

  return {
    status,
  }
}
