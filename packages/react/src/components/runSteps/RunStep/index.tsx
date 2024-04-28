import type { SerializedRunStep } from '@/types'
import { ToolCalls } from './ToolCalls'

type Args = {
  runStep: SerializedRunStep
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

RunStep.ToolCalls = ToolCalls
