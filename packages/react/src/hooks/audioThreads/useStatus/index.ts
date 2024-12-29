import { useMemo } from 'react'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { statusMessages } from './lib/statusMessages'

export const useStatus = () => {
  const { audioRuntime } = useAudioThreadContext()
  const latestMessageProps = useLatestMessage()

  const status = useMemo((): keyof typeof statusMessages => {
    if (audioRuntime.user.rawStatus === 'recording') return 'recording'
    if (audioRuntime.user.isPending) return 'creatingMessage'

    if (audioRuntime.assistant.paused || !audioRuntime.assistant.isAudioPlayed) return 'playerPaused'
    if (audioRuntime.assistant.playing || audioRuntime.assistant.isPending) return 'playing'
    if (!audioRuntime.assistant.isAudioPlayed && !audioRuntime.assistant.isReady) return 'loading'
    if (latestMessageProps.latestMessage?.status === 'in_progress') return 'creatingMessage'
    if (audioRuntime.user.rawStatus === 'idle') return 'idle'
    if (audioRuntime.user.rawStatus === 'paused') return 'recorderPaused'

    return 'loading'
  }, [
    latestMessageProps,
    audioRuntime,
  ])

  return {
    status,
  }
}
