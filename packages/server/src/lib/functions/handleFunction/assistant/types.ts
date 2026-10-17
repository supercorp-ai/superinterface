import OpenAI from 'openai'
import type { HandlerAssistant } from './findHandlerAssistant'
import type { HandlerThread } from './createHandlerThread'

// The handler assistant's own conversation that the tool call is forwarded to.
export type HandlerConversation = {
  assistant: HandlerAssistant
  thread: HandlerThread
  storageThreadId: string
}

// The parent run's tool call that the handler assistant answers.
export type ParentToolCall = {
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  controller: ReadableStreamDefaultController
  run: OpenAI.Beta.Threads.Runs.Run
}
