import type { StyleProps } from '@/types'
import { useStatus } from '@/hooks/audioThreads/useStatus'
import { StatusMessages } from './StatusMessages'

export const Status = (props: StyleProps) => {
  const { status } = useStatus()

  if (status === 'recording') {
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

  if (['recorderPaused', 'idle', 'playerPaused'].includes(status)) {
    return (
      <StatusMessages
        texts={[
          'Click the button below to activate',
        ]}
        {...props}
      />
    )
  }

  if (status === 'playing') {
    return (
      <StatusMessages
        texts={[
          'Listening',
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
