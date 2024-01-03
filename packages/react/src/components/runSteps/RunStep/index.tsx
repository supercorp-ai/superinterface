import OpenAI from 'openai'
import { ToolCalls } from './ToolCalls'

type Args = {
  runStep: OpenAI.Beta.Threads.Runs.RunStep
}

export const RunStep = ({
  runStep,
}: Args) => {
  if (runStep.step_details.type === 'tool_calls') {
    return (
      <ToolCalls
        stepDetails={runStep.step_details}
        runStep={runStep}
      />
    )
  }

  return null
}
