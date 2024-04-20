import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import { StatusMessage } from './StatusMessage'

export const Status = () => {
  const audioThreadContext = useAudioThreadContext()

  if (audioThreadContext.status === 'recording') {
    return (
      <StatusMessage>
        Listening
      </StatusMessage>
    )
  }

  if (['recorderPaused', 'idle', 'playerPaused'].includes(audioThreadContext.status)) {
    return (
      <StatusMessage>
        Click to activate
      </StatusMessage>
    )
  }

  if (audioThreadContext.status === 'playing') {
    return (
      <StatusMessage>
        Click to interrupt
      </StatusMessage>
    )
  }

  return (
    <StatusMessage>
      Thinking
    </StatusMessage>
  )
}
