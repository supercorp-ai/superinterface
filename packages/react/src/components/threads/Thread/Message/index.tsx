import { useMemo } from 'react'
import { Box } from '@radix-ui/themes'
import { SerializedMessage } from '@/types'
import { RunSteps } from '@/components/runSteps/RunSteps'
import { Provider } from './Provider'
import { Attachments } from './Attachments'
import { MessageContent } from '@/components/messages/MessageContent'
import { splitRunSteps } from './lib/splitRunSteps'
import type { StyleProps } from '@/types'

type Args = {
  message: SerializedMessage
}

export const Message = ({ message, className, style }: Args & StyleProps) => {
  const [olderRunSteps, laterRunSteps] = useMemo(
    () =>
      splitRunSteps({
        messageId: message.id,
        runSteps: message.runSteps,
      }),
    [message],
  )

  return (
    <Provider value={{ message }}>
      <Box
        className={className}
        style={style}
      >
        <RunSteps runSteps={olderRunSteps} />

        <Box style={{ wordBreak: 'break-word' }}>
          <Attachments message={message} />
          <MessageContent message={message} />
        </Box>

        <RunSteps runSteps={laterRunSteps} />
      </Box>
    </Provider>
  )
}
