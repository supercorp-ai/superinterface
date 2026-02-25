import type { SerializedRunStep } from '@/types'

export const splitRunSteps = ({
  messageId,
  runSteps,
}: {
  messageId: string
  runSteps: SerializedRunStep[]
}): [SerializedRunStep[], SerializedRunStep[]] => {
  if (!runSteps.length) return [[], []]

  const messageCreationRunStepIndex = runSteps.findIndex((runStep) => {
    if (runStep.step_details.type !== 'message_creation') return
    return runStep.step_details.message_creation.message_id === messageId
  })

  if (messageCreationRunStepIndex === -1) {
    return [[], runSteps]
  }

  let nextRunStepIndex = runSteps
    .slice(0, messageCreationRunStepIndex)
    .findLastIndex(
      (runStep) => runStep.step_details.type === 'message_creation',
    )
  if (nextRunStepIndex === -1) {
    nextRunStepIndex = 0
  }
  const laterRunSteps = runSteps.slice(
    nextRunStepIndex,
    messageCreationRunStepIndex,
  )

  const prevRunStepIndex = runSteps
    .slice(messageCreationRunStepIndex + 1)
    .findIndex((runStep) => runStep.step_details.type === 'message_creation')

  let olderRunSteps
  if (prevRunStepIndex === -1) {
    olderRunSteps = runSteps.slice(messageCreationRunStepIndex + 1)
  } else {
    olderRunSteps = runSteps.slice(
      messageCreationRunStepIndex + 1,
      messageCreationRunStepIndex + 1 + prevRunStepIndex,
    )
  }

  return [olderRunSteps, laterRunSteps]
}
