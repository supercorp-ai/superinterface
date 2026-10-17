import dayjs from 'dayjs'
import { optimisticId, serializeMessage } from '@superinterface/react/utils'
import { initialMessage, type InitialMessagesAssistant } from './initialMessage'

// A first page of messages for a thread that has not been created yet: the
// assistant's initial messages, each a second older than the one before.
export const initialMessagesResponse = async ({
  assistant,
}: {
  assistant: InitialMessagesAssistant
}) => {
  const threadId = optimisticId()
  const initialCreatedAt = dayjs().unix()

  return {
    data: await Promise.all(
      assistant.initialMessages.map(async (message, index) =>
        serializeMessage({
          message: initialMessage({
            message,
            assistant,
            threadId,
            createdAt: initialCreatedAt - index - 1,
          }),
        }),
      ),
    ),
    hasNextPage: false,
    lastId: null,
  }
}
