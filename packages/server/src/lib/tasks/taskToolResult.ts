import OpenAI from 'openai'
import { serializeTask } from './serializeTask'
import { taskToolOutput } from './taskToolOutput'
import type { TaskResult } from './TaskResult'

export const taskToolResult = ({
  toolCall,
  result,
}: {
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  result: TaskResult
}) => {
  if (!result.ok) return taskToolOutput({ toolCall, output: result.error })

  return taskToolOutput({
    toolCall,
    output: JSON.stringify({ task: serializeTask({ task: result.task }) }),
  })
}
