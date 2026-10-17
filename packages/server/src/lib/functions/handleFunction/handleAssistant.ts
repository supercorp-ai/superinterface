import OpenAI from 'openai'
import {
  AssistantHandler,
  Assistant,
  Thread,
  type PrismaClient,
} from '@prisma/client'
import { assistantClientAdapter } from '@/lib/assistants/assistantClientAdapter'
import {
  failToolCall,
  type ToolCallLogScope,
} from '@/lib/toolCalls/failToolCall'
import { parseAssistantArguments } from './assistant/parseAssistantArguments'
import { findHandlerAssistant } from './assistant/findHandlerAssistant'
import { createHandlerThread } from './assistant/createHandlerThread'
import { resolveStorageThreadId } from './assistant/resolveStorageThreadId'
import { runHandlerAssistant } from './assistant/runHandlerAssistant'

export const handleAssistant = async ({
  assistantHandler,
  toolCall,
  controller,
  run,
  assistant: parentAssistant,
  thread: parentThread,
  prisma,
}: {
  assistantHandler: AssistantHandler
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  controller: ReadableStreamDefaultController
  run: OpenAI.Beta.Threads.Runs.Run
  assistant: Assistant
  thread: Thread
  prisma: PrismaClient
}) => {
  const parentScope: ToolCallLogScope = {
    workspaceId: parentAssistant.workspaceId,
    assistantId: parentAssistant.id,
    threadId: parentThread.id,
  }

  const parsed = parseAssistantArguments({ toolCall })

  if (!parsed.ok) {
    return failToolCall({
      toolCall,
      scope: parentScope,
      message: `Failed parsing Assistant function arguments: ${parsed.errorMessage}`,
      output: 'Invalid arguments.',
      prisma,
    })
  }

  const assistant = await findHandlerAssistant({ assistantHandler, prisma })

  if (!assistant) {
    return failToolCall({
      toolCall,
      scope: parentScope,
      message: 'Assistant not found when handling Assistant function.',
      output: 'Assistant not found.',
      prisma,
    })
  }

  const assistantScope: ToolCallLogScope = {
    workspaceId: assistant.workspaceId,
    assistantId: assistant.id,
  }

  const createThreadClient = assistantClientAdapter({ assistant, prisma })

  let thread

  try {
    thread = await createHandlerThread({
      client: createThreadClient,
      assistant,
      parentThread,
      prisma,
    })
  } catch {
    return failToolCall({
      toolCall,
      scope: assistantScope,
      message: 'Failed creating thread inside Assistant function.',
      output: 'Failed creating thread.',
      prisma,
    })
  }

  const threadScope: ToolCallLogScope = {
    ...assistantScope,
    threadId: thread.id,
  }

  let storageThreadId

  try {
    storageThreadId = await resolveStorageThreadId({
      assistant,
      thread,
      prisma,
    })
  } catch {
    return failToolCall({
      toolCall,
      scope: threadScope,
      message: 'Failed getting managed OpenAI thread ID.',
      output: 'Failed getting managed OpenAI thread ID.',
      prisma,
    })
  }

  if (!storageThreadId) {
    return failToolCall({
      toolCall,
      scope: threadScope,
      message: 'Invalid thread configuration',
      output: 'Invalid thread configuration',
      prisma,
    })
  }

  return runHandlerAssistant({
    args: parsed.args,
    conversation: { assistant, thread, storageThreadId },
    parent: { toolCall, controller, run },
    prisma,
  })
}
