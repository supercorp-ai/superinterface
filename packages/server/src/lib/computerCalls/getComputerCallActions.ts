import OpenAI from 'openai'
import type { ComputerCall, ComputerCallActions } from './types'
import { isRecord } from './isRecord'
import { getComputerActions } from './getComputerActions'
import { getAcknowledgedSafetyChecks } from './getAcknowledgedSafetyChecks'

// Computer calls arrive as function tool calls carrying a computer_call.
type ComputerToolCall = {
  computer_call?: unknown
}

const isComputerCall = (value: unknown): value is ComputerCall =>
  isRecord(value)

// The actions a computer tool call asks for and the safety checks it
// acknowledges, or none when the tool call has no computer call.
export const getComputerCallActions = ({
  toolCall,
}: {
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
}): ComputerCallActions => {
  const { computer_call: computerCall } =
    toolCall as unknown as ComputerToolCall

  if (!isComputerCall(computerCall)) {
    return {
      actions: [],
      acknowledgedSafetyChecks: [],
    }
  }

  return {
    actions: getComputerActions({ computerCall }),
    acknowledgedSafetyChecks: getAcknowledgedSafetyChecks({ computerCall }),
  }
}
