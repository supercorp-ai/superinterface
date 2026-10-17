import type { ComputerCall, SafetyCheck } from './types'
import { isRecord } from './isRecord'

const isSafetyCheck = (value: unknown): value is SafetyCheck =>
  isRecord(value) && typeof value.id === 'string'

// Acknowledges the computer call's pending safety checks by their ids.
export const getAcknowledgedSafetyChecks = ({
  computerCall: { pending_safety_checks: pendingSafetyChecks },
}: {
  computerCall: ComputerCall
}): SafetyCheck[] => {
  if (!Array.isArray(pendingSafetyChecks)) {
    return []
  }

  return pendingSafetyChecks.filter(isSafetyCheck).map(({ id }) => ({ id }))
}
