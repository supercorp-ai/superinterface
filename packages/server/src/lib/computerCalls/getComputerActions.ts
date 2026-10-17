import type { ComputerAction } from './handleComputerCall/callComputerAction'
import type { ComputerCall } from './types'
import { isComputerAction } from './isComputerAction'

// The actions of a computer call in either the batched or the legacy single
// action shape.
export const getComputerActions = ({
  computerCall: { actions, action },
}: {
  computerCall: ComputerCall
}): ComputerAction[] => {
  if (Array.isArray(actions)) {
    return actions.filter(isComputerAction)
  }

  if (isComputerAction(action)) {
    return [action]
  }

  return []
}
