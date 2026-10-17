import type { PrismaClient } from '@prisma/client'
import { prepareMessageThread } from './prepareMessageThread'
import type { ThreadVariables } from '@/lib/threads/threadVariables'
import { getMessageContent } from './getMessageContent'
import { streamUserMessage } from './streamUserMessage'
import type { CreateMessageAssistant } from './createMessageAssistant'
import type { UserMessageInput } from './parseCreateMessageBody'
import type { OnSuccessCreateThread } from './onSuccessCreateThread'

// Sends the user's message to the assistant: finds or creates its thread,
// turns the text or audio sent into message content and streams the answer.
export const sendUserMessage = async ({
  assistant,
  prisma,
  message: { textContent, audioContent, attachments },
  variables,
  onSuccessCreateThread,
  signal,
}: {
  assistant: CreateMessageAssistant
  prisma: PrismaClient
  message: UserMessageInput
  variables: ThreadVariables
  onSuccessCreateThread: OnSuccessCreateThread
  signal: AbortSignal
}) => {
  const preparedThread = await prepareMessageThread({
    assistant,
    prisma,
    variables,
    onSuccessCreateThread,
  })

  if (preparedThread.errorResponse) return preparedThread.errorResponse

  const messageContent = await getMessageContent({
    textContent,
    audioContent,
    assistant,
    thread: preparedThread.thread,
    prisma,
  })

  if (messageContent.errorResponse) return messageContent.errorResponse

  return streamUserMessage({
    assistant,
    preparedThread,
    content: messageContent.content,
    attachments,
    variables,
    prisma,
    signal,
  })
}
