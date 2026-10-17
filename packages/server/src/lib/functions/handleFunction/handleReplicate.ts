import OpenAI from 'openai'
import {
  ReplicateHandler,
  Assistant,
  Thread,
  type PrismaClient,
} from '@prisma/client'
import { rejectToolCall } from '@/lib/toolCalls/rejectToolCall'
import { toolCallLogScope } from '@/lib/toolCalls/toolCallLogScope'
import { parseFunctionArguments } from './parseFunctionArguments'
import { runReplicate } from './replicate/runReplicate'

export const handleReplicate = async ({
  replicateHandler,
  toolCall,
  assistant,
  thread,
  prisma,
}: {
  replicateHandler: ReplicateHandler
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  assistant: Assistant
  thread: Thread
  prisma: PrismaClient
}) => {
  const scope = toolCallLogScope({ assistant, thread })
  const parsed = parseFunctionArguments({ json: toolCall.function.arguments })

  if (!parsed.ok) {
    return rejectToolCall({
      toolCall,
      scope,
      message: `Failed parsing Replicate function arguments: ${parsed.error.message}`,
      output: 'Invalid arguments.',
      prisma,
    })
  }

  // RUN is the only Replicate handler type.
  try {
    const result = await runReplicate({ replicateHandler, args: parsed.args })

    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify(result),
    }
  } catch (e) {
    // The Replicate SDK fails with Error instances.
    return rejectToolCall({
      toolCall,
      scope,
      message: `Failed calling Replicate RUN function: ${(e as Error).message}`,
      output: 'Function call failed.',
      prisma,
    })
  }
}
