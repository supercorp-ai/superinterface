import type { Assistant, RequestHandler, Thread } from '@prisma/client'
import type { FunctionArguments } from '../parseFunctionArguments'

// Everything a request handler template ({{variable}}) can be filled from.
export type RequestTemplate = {
  requestHandler: RequestHandler
  args: FunctionArguments
  thread: Thread
  assistant: Assistant
}

// A filled-in part of the request and the template variables left unfilled.
export type FilledTemplate<Value> = {
  value: Value
  missing: string[]
}

// Why a request handler call failed, before or after sending the request.
export type RequestFailure = {
  reason: string
  errorMessage: string
}
