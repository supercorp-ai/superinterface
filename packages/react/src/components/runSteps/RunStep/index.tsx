import type { SerializedRunStep, StyleProps } from '@/types'
import { ToolCalls } from './ToolCalls'

type Args = {
  runStep: SerializedRunStep
} & StyleProps

export const RunStep = ({
  runStep,
  className,
  style,
}: Args) => {
  if (runStep.step_details.type === 'tool_calls') {
    return (
      <ToolCalls
        className={className}
        style={style}
        stepDetails={runStep.step_details}
        runStep={runStep}
      />
    )
  }

  return null
}

RunStep.ToolCalls = ToolCalls
