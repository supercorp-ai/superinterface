import _ from 'lodash'
import { useMemo, Fragment } from 'react'
import { isEmpty } from 'radash'
import {
  Box,
} from '@radix-ui/themes'
import { StartingContentSkeleton } from '@/components/skeletons/StartingContentSkeleton'
import { SerializedMessage } from '@/types'
import { RunSteps } from '@/components/runSteps/RunSteps'
import { useIsMutatingMessage } from '@/hooks/messages/useIsMutatingMessage'
import { Provider } from './Provider'
import { TextContent } from './TextContent'
import { Attachments } from './Attachments'

type Args = {
  message: SerializedMessage
}

export const Message = ({
  message,
}: Args) => {
  const [olderRunSteps, laterRunSteps] = useMemo(() => {
    if (!message.runSteps.length) return [[], []]

    const messageCreationRunStepIndex = message.runSteps.findIndex((runStep) => {
      if (runStep.step_details.type !== 'message_creation') return

      return runStep.step_details.message_creation.message_id === message.id
    })

    let nextRunStepIndex = message.runSteps.slice(0, messageCreationRunStepIndex).findLastIndex((runStep) => (
      runStep.step_details.type === 'message_creation'
    ))
    if (nextRunStepIndex === -1) {
      nextRunStepIndex = 0
    }
    const laterRunSteps = message.runSteps.slice(nextRunStepIndex, messageCreationRunStepIndex)

    const prevRunStepIndex = message.runSteps.slice(messageCreationRunStepIndex + 1).findIndex((runStep) => (
      runStep.step_details.type === 'message_creation'
    ))

    let olderRunSteps

    if (prevRunStepIndex === -1) {
      olderRunSteps = message.runSteps.slice(messageCreationRunStepIndex + 1)
    } else {
      olderRunSteps = message.runSteps.slice(messageCreationRunStepIndex + 1, messageCreationRunStepIndex + prevRunStepIndex)
    }

    return [olderRunSteps, laterRunSteps]
  }, [message])

  const isMutatingMessage = useIsMutatingMessage()

  const isInProgress = useMemo(() => {
    if (!isMutatingMessage) return false
    if (message.status === 'in_progress') return true

    return message.runSteps.some((rs) => rs.status === 'in_progress')
  }, [message])

  return (
    <Provider value={{ message }}>
      <Box>
        <RunSteps
          runSteps={olderRunSteps}
        />

        <Box>
          <Attachments
            message={message}
          />

          {message.content.map((content, index) => (
            <Fragment
              key={index}
            >
              {content.type === 'text' && (
                <TextContent
                  content={content}
                />
              )}
            </Fragment>
          ))}

          {isInProgress && isEmpty(laterRunSteps) && (
            <StartingContentSkeleton />
          )}
        </Box>

        <RunSteps
          runSteps={laterRunSteps}
        />

        {isInProgress && !isEmpty(laterRunSteps) && (
          <Box>
            <StartingContentSkeleton />
          </Box>
        )}
      </Box>
    </Provider>
  )
}
