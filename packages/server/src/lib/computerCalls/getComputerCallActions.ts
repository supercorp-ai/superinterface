import OpenAI from 'openai'

type ComputerAction = Record<string, unknown>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Pass through any object-shaped action to the MCP server. The MCP
// (in loose mode) is the authority on what's a valid action — it
// handles canonical shapes, small-model drift (`{keys:[...]}` without
// `type`, `type` placed as a wrapper sibling, natural-language verbs,
// chord expansion, etc.) and rejects junk with `isError:true`.
// Previously this guard also required `typeof value.type === 'string'`,
// which silently filtered out drifted shapes from gemma-4 & similar
// local models and surfaced them as "No computer actions provided",
// sending the model into an endless retry loop.
const isComputerAction = (value: unknown): value is ComputerAction =>
  isRecord(value)

const getPendingSafetyChecks = ({
  toolCall,
}: {
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
}) => {
  const computerCall = (toolCall as unknown as Record<string, unknown>)
    .computer_call

  if (
    !isRecord(computerCall) ||
    !Array.isArray(computerCall.pending_safety_checks)
  ) {
    return []
  }

  return computerCall.pending_safety_checks
    .filter(
      (psc): psc is { id: string } =>
        isRecord(psc) && typeof psc.id === 'string',
    )
    .map((psc) => ({
      id: psc.id,
    }))
}

export const getComputerCallActions = ({
  toolCall,
}: {
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
}) => {
  const computerCall = (toolCall as unknown as Record<string, unknown>)
    .computer_call

  if (!isRecord(computerCall)) {
    return {
      actions: [],
      acknowledgedSafetyChecks: [],
    }
  }

  if (Array.isArray(computerCall.actions)) {
    return {
      actions: computerCall.actions.filter(isComputerAction),
      acknowledgedSafetyChecks: getPendingSafetyChecks({ toolCall }),
    }
  }

  if (isComputerAction(computerCall.action)) {
    return {
      actions: [computerCall.action],
      acknowledgedSafetyChecks: getPendingSafetyChecks({ toolCall }),
    }
  }

  return {
    actions: [],
    acknowledgedSafetyChecks: getPendingSafetyChecks({ toolCall }),
  }
}
