import type { McpConnection } from '@/types'
import { callComputerAction, type ComputerAction } from './callComputerAction'

// Runs the actions one after another and returns the last tool result.
// Callers pass a non-empty list of actions.
export const callComputerActions = async ({
  mcpConnection,
  actions,
}: {
  mcpConnection: McpConnection
  actions: ComputerAction[]
}) => {
  const [firstAction, ...restActions] = actions

  let mcpServerToolOutput = await callComputerAction({
    mcpConnection,
    action: firstAction,
  })

  for (const action of restActions) {
    mcpServerToolOutput = await callComputerAction({ mcpConnection, action })
  }

  return mcpServerToolOutput
}
