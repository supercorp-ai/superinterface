import _ from 'lodash'
import { useMemo, Fragment } from 'react'
import {
  Box,
} from '@radix-ui/themes'
import { StartingContentSkeleton } from '@/components/skeletons/StartingContentSkeleton'
import { Message as MessageType } from '@/types'
import { RunSteps } from '@/components/runSteps/RunSteps'
import { Provider } from './Provider'
import { TextContent } from './TextContent'

type Args = {
  message: MessageType
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

  return (
    <Provider value={{ message }}>
      <Box>
        <RunSteps
          runSteps={olderRunSteps}
        />

        <Box>
          {message.content.map((content, index) => (
            <Fragment
              key={index}
            >
              {content.type === 'text' && (
                <TextContent content={content} />
              )}
            </Fragment>
          ))}
          {message.status === 'in_progress' && (
            <StartingContentSkeleton />
          )}
        </Box>

        <RunSteps
          runSteps={laterRunSteps}
        />
      </Box>
    </Provider>
  )
}
