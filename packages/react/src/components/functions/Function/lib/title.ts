import OpenAI from 'openai'

type Args = {
  fn: OpenAI.Beta.Threads.Runs.FunctionToolCall.Function
  runStep: OpenAI.Beta.Threads.Runs.RunStep
}

export const title = ({
  fn,
  runStep,
}: Args) => {
  if (runStep.completed_at) {
    return `Finished ${fn.name}`
  } else if (runStep.cancelled_at) {
    return `Cancelled ${fn.name}`
  } else {
    return `Calling ${fn.name}`
  }
}
