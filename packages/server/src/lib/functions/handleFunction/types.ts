import OpenAI from 'openai'
import type { Prisma, Thread, PrismaClient } from '@prisma/client'

export type FunctionAssistant = Prisma.AssistantGetPayload<{
  include: {
    mcpServers: {
      include: {
        stdioTransport: true
        httpTransport: true
        sseTransport: true
      }
    }
    functions: {
      include: {
        handler: {
          include: {
            requestHandler: true
            firecrawlHandler: true
            replicateHandler: true
            clientToolHandler: true
            assistantHandler: true
            createTaskHandler: true
            listTasksHandler: true
            updateTaskHandler: true
            deleteTaskHandler: true
          }
        }
      }
    }
  }
}>

export type FunctionHandler = NonNullable<
  FunctionAssistant['functions'][number]['handler']
>

// The function tool call being handled and where it was made.
export type FunctionCall = {
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  assistant: FunctionAssistant
  thread: Thread
  controller: ReadableStreamDefaultController
  run: OpenAI.Beta.Threads.Runs.Run
  prisma: PrismaClient
}

export type FunctionOutput = {
  tool_call_id: string
  output: unknown
}
