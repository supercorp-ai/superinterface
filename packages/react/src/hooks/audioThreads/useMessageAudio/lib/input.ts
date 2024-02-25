import OpenAI from 'openai'
import { isEmpty } from 'radash'
import { ThreadMessage } from '@/types'

type Args = {
  threadMessage: ThreadMessage
}

export const input = ({
  threadMessage,
}: Args) => {
  const textContents = threadMessage.content.filter((c) => c.type === 'text') as OpenAI.Beta.Threads.Messages.MessageContentText[]
  const result = textContents.map((c) => c.text.value).join(' ')

  if (isEmpty(result)) return null

  return result
}
