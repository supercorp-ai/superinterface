import OpenAI from 'openai'
import {
  ClientToolHandler,
  Assistant,
  Thread,
  type PrismaClient,
} from '@prisma/client'
import { rejectToolCall } from '@/lib/toolCalls/rejectToolCall'
import { toolCallLogScope } from '@/lib/toolCalls/toolCallLogScope'
import { NO_ARGUMENTS, parseFunctionArguments } from './parseFunctionArguments'
import { requestClientToolCall } from './clientTool/requestClientToolCall'
import { clientToolOutputKeys } from './clientTool/clientToolOutputKeys'
import { markClientToolPending } from './clientTool/markClientToolPending'
import { pollClientToolOutput } from './clientTool/pollClientToolOutput'

export const handleClientTool = async ({
  clientToolHandler,
  toolCall,
  assistant,
  thread,
  controller,
  run,
  prisma,
}: {
  clientToolHandler: ClientToolHandler
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  assistant: Assistant
  thread: Thread
  controller: ReadableStreamDefaultController
  run: OpenAI.Beta.Threads.Runs.Run
  prisma: PrismaClient
}) => {
  const parsed = parseFunctionArguments({
    json: toolCall.function.arguments || NO_ARGUMENTS,
  })

  if (!parsed.ok) {
    return rejectToolCall({
      toolCall,
      scope: toolCallLogScope({ assistant, thread }),
      message: `Failed parsing client tool function arguments: ${parsed.error.message}`,
      output: 'Invalid arguments.',
      prisma,
    })
  }

  requestClientToolCall({
    clientToolHandler,
    args: parsed.args,
    toolCall,
    controller,
    run,
  })

  const keys = clientToolOutputKeys({ toolCallId: toolCall.id })

  await markClientToolPending({ keys })

  return {
    tool_call_id: toolCall.id,
    output: await pollClientToolOutput({ keys }),
  }
}
