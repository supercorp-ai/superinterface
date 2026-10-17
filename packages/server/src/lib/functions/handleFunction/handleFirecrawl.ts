import OpenAI from 'openai'
import {
  FirecrawlHandler,
  Assistant,
  Thread,
  type PrismaClient,
} from '@prisma/client'
import { rejectToolCall } from '@/lib/toolCalls/rejectToolCall'
import { toolCallLogScope } from '@/lib/toolCalls/toolCallLogScope'
import { parseFunctionArguments } from './parseFunctionArguments'
import { firecrawlCalls } from './firecrawl/firecrawlCalls'

export const handleFirecrawl = async ({
  firecrawlHandler,
  toolCall,
  assistant,
  thread,
  prisma,
}: {
  firecrawlHandler: FirecrawlHandler
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
      message: `Failed parsing Firecrawl function arguments: ${parsed.error.message}`,
      output: 'Invalid arguments.',
      prisma,
    })
  }

  try {
    const callFirecrawl = firecrawlCalls[firecrawlHandler.type]
    const result = await callFirecrawl({ firecrawlHandler, args: parsed.args })

    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify(result),
    }
  } catch (e) {
    // The Firecrawl SDK, fetch and argument access failures are Errors.
    return rejectToolCall({
      toolCall,
      scope,
      message: `Failed calling Firecrawl function: ${(e as Error).message}`,
      output: 'Function call failed.',
      prisma,
    })
  }
}
