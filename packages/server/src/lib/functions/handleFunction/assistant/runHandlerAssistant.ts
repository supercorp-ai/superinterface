import { type PrismaClient } from '@prisma/client'
import { assistantClientAdapter } from '@/lib/assistants/assistantClientAdapter'
import { createRunOpts } from '@/lib/runs/createRunOpts'
import {
  failToolCall,
  type ToolCallLogScope,
} from '@/lib/toolCalls/failToolCall'
import type { AssistantArguments } from './parseAssistantArguments'
import type { HandlerConversation, ParentToolCall } from './types'
import { sendHandlerMessage } from './sendHandlerMessage'
import { streamHandlerMessages } from './streamHandlerMessages'

// Sends the message to the handler assistant's thread, runs it and streams the
// child run into the parent stream.
export const runHandlerAssistant = async ({
  args,
  conversation,
  parent,
  prisma,
}: {
  args: AssistantArguments
  conversation: HandlerConversation
  parent: ParentToolCall
  prisma: PrismaClient
}) => {
  const { assistant, thread, storageThreadId } = conversation
  const { toolCall } = parent

  const scope: ToolCallLogScope = {
    workspaceId: assistant.workspaceId,
    assistantId: assistant.id,
    threadId: thread.id,
  }

  const client = assistantClientAdapter({
    assistant,
    prisma,
    thread,
  })

  try {
    await sendHandlerMessage({ client, conversation, args, toolCall })
  } catch {
    return failToolCall({
      toolCall,
      scope,
      message: 'Failed creating message.',
      output: 'Failed creating message.',
      prisma,
    })
  }

  const runOpts = await createRunOpts({
    assistant,
    thread,
    prisma,
  })

  let createRunStream

  try {
    createRunStream = await client.beta.threads.runs.create(
      storageThreadId,
      runOpts,
    )
  } catch (e) {
    // The OpenAI SDK only throws Error instances.
    return failToolCall({
      toolCall,
      scope,
      message: `Failed creating run stream: ${(e as Error).message}`,
      output: 'Failed creating run stream.',
      prisma,
    })
  }

  return {
    tool_call_id: toolCall.id,
    output: await streamHandlerMessages({
      client,
      createRunStream,
      conversation,
      parent,
      prisma,
    }),
  }
}
