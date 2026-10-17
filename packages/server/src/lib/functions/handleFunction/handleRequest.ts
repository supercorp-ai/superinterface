import OpenAI from 'openai'
import {
  RequestHandler,
  Assistant,
  Thread,
  type PrismaClient,
} from '@prisma/client'
import { rejectToolCall } from '@/lib/toolCalls/rejectToolCall'
import { toolCallLogScope } from '@/lib/toolCalls/toolCallLogScope'
import { parseFunctionArguments } from './parseFunctionArguments'
import { buildRequest } from './request/buildRequest'
import { fetchRequestOutput } from './request/fetchRequestOutput'
import { failRequest } from './request/failRequest'

export const handleRequest = async ({
  requestHandler,
  toolCall,
  assistant,
  thread,
  prisma,
}: {
  requestHandler: RequestHandler
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  assistant: Assistant
  thread: Thread
  prisma: PrismaClient
}) => {
  const scope = toolCallLogScope({ assistant, thread })
  const parsed = parseFunctionArguments({ json: toolCall.function.arguments })

  if (!parsed.ok) {
    return failRequest({
      toolCall,
      scope,
      failure: {
        reason: 'Failed parsing request function arguments',
        errorMessage: parsed.error.message,
      },
      prisma,
    })
  }

  const { url, init, missing } = buildRequest({
    requestHandler,
    args: parsed.args,
    thread,
    assistant,
  })

  if (missing.length) {
    const message = `Missing variables in request handler: ${missing.join(', ')}`

    return rejectToolCall({
      toolCall,
      scope,
      message,
      output: message,
      prisma,
    })
  }

  const outcome = await fetchRequestOutput({ url, init })

  if (!outcome.ok) {
    return failRequest({ toolCall, scope, failure: outcome, prisma })
  }

  return { tool_call_id: toolCall.id, output: outcome.output }
}
