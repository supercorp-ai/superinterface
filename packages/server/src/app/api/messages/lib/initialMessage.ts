import type OpenAI from 'openai'
import { MessageRole, type Prisma } from '@prisma/client'
import { optimisticId } from '@superinterface/react/utils'
import { storageAssistantId } from '@/lib/assistants/storageAssistantId'

type Message = OpenAI.Beta.Threads.Messages.Message

export type InitialMessagesAssistant = Prisma.AssistantGetPayload<{
  include: {
    initialMessages: true
  }
}>

// An assistant's initial message as a completed text message of a thread
// that does not exist yet.
export const initialMessage = ({
  message,
  assistant,
  threadId,
  createdAt,
}: {
  message: InitialMessagesAssistant['initialMessages'][number]
  assistant: InitialMessagesAssistant
  threadId: string
  createdAt: number
}): Message & { runSteps: [] } => ({
  id: optimisticId(),
  role: message.role.toLowerCase() as Message['role'],
  created_at: createdAt,
  object: 'thread.message',
  content: [
    {
      type: 'text',
      text: {
        annotations: [],
        value: message.content,
      },
    },
  ],
  run_id: null,
  assistant_id:
    message.role === MessageRole.ASSISTANT
      ? storageAssistantId({ assistant })
      : null,
  thread_id: threadId,
  attachments: message.attachments as Message['attachments'],
  metadata: message.metadata as Message['metadata'],
  completed_at: createdAt,
  incomplete_at: null,
  incomplete_details: null,
  status: 'completed',
  runSteps: [],
})
