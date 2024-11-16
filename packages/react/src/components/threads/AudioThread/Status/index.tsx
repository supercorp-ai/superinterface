import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import type { StyleProps } from '@/types'
import { StatusMessages } from './StatusMessages'

export const Status = (props: StyleProps) => {
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
        {...props}
      />
    )
  }

  if (['recorderPaused', 'idle', 'playerPaused'].includes(audioThreadContext.status)) {
    return (
      <StatusMessages
        texts={[
          'Click the button below to activate',
        ]}
        {...props}
      />
    )
  }

  if (audioThreadContext.status === 'playing') {
    return (
      <StatusMessages
        texts={[
          'Click the button below to interrupt',
        ]}
        {...props}
      />
    )
  }

  return (
    <StatusMessages
      texts={[
        'Thinking',
      ]}
      {...props}
    />
  )
}
