import OpenAI from 'openai'
import type { AssistantArguments } from './parseAssistantArguments'
import type { HandlerConversation } from './types'

// Adds the parent's message to the handler assistant's thread as a user message.
export const sendHandlerMessage = ({
  client,
  conversation: { assistant, storageThreadId },
  args,
  toolCall,
}: {
  client: OpenAI
  conversation: HandlerConversation
  args: AssistantArguments
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
}) =>
  client.beta.threads.messages.create(storageThreadId, {
    role: 'user',
    content: args.message,
    metadata: {
      assistantId: assistant.id,
      toolCallId: toolCall.id,
    },
  })
