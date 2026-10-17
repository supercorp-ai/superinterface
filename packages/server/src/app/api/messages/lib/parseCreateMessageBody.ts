import { createMessageBodySchema } from './createMessageBodySchema'

// Splits a create message body into the message sent and the variables the
// rest of the body becomes, threadId included.
export const parseCreateMessageBody = ({ body }: { body: unknown }) => {
  const {
    audioContent,
    content: textContent,
    attachments,
    assistantId,
    publicApiKey,
    ...variables
  } = createMessageBodySchema.parse(body)

  return {
    assistantId,
    publicApiKey,
    threadId: variables.threadId,
    message: { textContent, audioContent, attachments },
    variables,
  }
}

export type UserMessageInput = ReturnType<
  typeof parseCreateMessageBody
>['message']
