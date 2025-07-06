import _ from 'lodash'
import { useMemo } from 'react'
import { Box } from '@radix-ui/themes'
import { SerializedMessage } from '@/types'
import { RunSteps } from '@/components/runSteps/RunSteps'
import { Provider } from './Provider'
import { Attachments } from './Attachments'
import { MessageContent } from '@/components/messages/MessageContent'
import type { StyleProps } from '@/types'

type Args = {
  message: SerializedMessage
}

export const Message = ({ message, className, style }: Args & StyleProps) => {
  const [olderRunSteps, laterRunSteps] = useMemo(() => {
    if (!message.runSteps.length) return [[], []]

    const messageCreationRunStepIndex = message.runSteps.findIndex(
      (runStep) => {
        if (runStep.step_details.type !== 'message_creation') return
        return runStep.step_details.message_creation.message_id === message.id
      },
    )

    if (messageCreationRunStepIndex === -1) {
      return [[], message.runSteps]
    }

    let nextRunStepIndex = message.runSteps
      .slice(0, messageCreationRunStepIndex)
      .findLastIndex(
        (runStep) => runStep.step_details.type === 'message_creation',
      )
    if (nextRunStepIndex === -1) {
      nextRunStepIndex = 0
    }
    const laterRunSteps = message.runSteps.slice(
      nextRunStepIndex,
      messageCreationRunStepIndex,
    )

    const prevRunStepIndex = message.runSteps
      .slice(messageCreationRunStepIndex + 1)
      .findIndex((runStep) => runStep.step_details.type === 'message_creation')

    let olderRunSteps
    if (prevRunStepIndex === -1) {
      olderRunSteps = message.runSteps.slice(messageCreationRunStepIndex + 1)
    } else {
      olderRunSteps = message.runSteps.slice(
        messageCreationRunStepIndex + 1,
        messageCreationRunStepIndex + prevRunStepIndex,
      )
    }

    return [olderRunSteps, laterRunSteps]
  }, [message])

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
