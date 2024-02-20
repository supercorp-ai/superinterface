import _ from 'lodash'
import { useMemo } from 'react'
import {
  Box,
} from '@radix-ui/themes'
import { ThreadMessage as ThreadMessageType } from '@/types'
import { RunSteps } from '@/components/runSteps/RunSteps'
import { TextContent } from './TextContent'

type Args = {
  threadMessage: ThreadMessageType
}

export const ThreadMessage = ({
  threadMessage,
}: Args) => {
  const [olderRunSteps, laterRunSteps] = useMemo(() => {
    if (!threadMessage.runSteps.length) return [[], []]

    const messageCreationRunStepIndex = threadMessage.runSteps.findIndex((runStep) => {
      if (runStep.step_details.type !== 'message_creation') return

      return runStep.step_details.message_creation.message_id === threadMessage.id
    })

    let nextRunStepIndex = threadMessage.runSteps.slice(0, messageCreationRunStepIndex).findLastIndex((runStep) => (
      runStep.step_details.type === 'message_creation'
    ))
    if (nextRunStepIndex === -1) {
      nextRunStepIndex = 0
    }
    const laterRunSteps = threadMessage.runSteps.slice(nextRunStepIndex, messageCreationRunStepIndex)

    const prevRunStepIndex = threadMessage.runSteps.slice(messageCreationRunStepIndex + 1).findIndex((runStep) => (
      runStep.step_details.type === 'message_creation'
    ))

    let olderRunSteps

    if (prevRunStepIndex === -1) {
      olderRunSteps = threadMessage.runSteps.slice(messageCreationRunStepIndex + 1)
    } else {
      olderRunSteps = threadMessage.runSteps.slice(messageCreationRunStepIndex + 1, messageCreationRunStepIndex + prevRunStepIndex)
    }

    return [olderRunSteps, laterRunSteps]

  }, [threadMessage])

  return (
    <Box>
      <RunSteps
        runSteps={olderRunSteps}
      />

      {threadMessage.content.map((content, index) => (
        <Box
          key={index}
        >
          {content.type === 'text' && (
            <TextContent content={content} />
          )}
        </Box>
      ))}

      <RunSteps
        runSteps={laterRunSteps}
      />
    </Box>
  )
}
