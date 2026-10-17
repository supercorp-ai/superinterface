import OpenAI from 'openai'
import type { TaskToolArgsCheck } from './TaskToolArgsCheck'

export const parseTaskToolArgsJson = ({
  toolCall,
}: {
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
}): TaskToolArgsCheck<unknown> => {
  try {
    return {
      ok: true,
      value: JSON.parse(toolCall.function.arguments || '{}'),
    }
  } catch (error) {
    // JSON.parse only throws SyntaxError.
    return {
      ok: false,
      logMessage: `Failed parsing task function arguments: ${(error as SyntaxError).message}`,
      error: 'Invalid arguments.',
    }
  }
}
