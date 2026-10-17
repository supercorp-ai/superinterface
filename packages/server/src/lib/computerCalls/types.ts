import type { ComputerAction } from './handleComputerCall/callComputerAction'

// The computer call a model sent, as received: any field may be missing or
// malformed.
export type ComputerCall = {
  // The GPT-5.4 batched actions shape.
  actions?: unknown
  // The legacy single action shape.
  action?: unknown
  pending_safety_checks?: unknown
}

export type SafetyCheck = {
  id: string
}

// The actions to run for a computer call and the safety checks it
// acknowledges.
export type ComputerCallActions = {
  actions: ComputerAction[]
  acknowledgedSafetyChecks: SafetyCheck[]
}
