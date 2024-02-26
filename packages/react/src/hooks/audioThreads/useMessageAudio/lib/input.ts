import OpenAI from 'openai'
import { isEmpty } from 'radash'
import { Message } from '@/types'

type Args = {
  message: Message
}

export const input = ({
  message,
}: Args) => {
  const textContents = message.content.filter((c) => c.type === 'text') as OpenAI.Beta.Threads.Messages.MessageContentText[]
  const result = textContents.map((c) => c.text.value).join(' ')

  if (isEmpty(result)) return null

  return result
}
