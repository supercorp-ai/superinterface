import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import { StatusMessages } from './StatusMessages'

export const Status = () => {
  const audioThreadContext = useAudioThreadContext()

  if (audioThreadContext.status === 'recording') {
    return (
      <StatusMessages
        texts={[
          'Start speaking',
          'Listening',
          'Finish speaking to send',
          'Click the button below to send manually',
        ]}
      />
    )
  }

  if (['recorderPaused', 'idle', 'playerPaused'].includes(audioThreadContext.status)) {
    return (
      <StatusMessages
        texts={[
          'Click the button below to activate',
        ]}
      />
    )
  }

  if (audioThreadContext.status === 'playing') {
    return (
      <StatusMessages
        texts={[
          'Click the button below to interrupt',
        ]}
      />
    )
  }

  return (
    <StatusMessages
      texts={[
        'Thinking',
      ]}
    />
  )
}
