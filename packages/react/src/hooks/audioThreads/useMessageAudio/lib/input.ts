import OpenAI from 'openai'
import { isEmpty } from 'radash'
import { Message } from '@/types'

type Args = {
  message: Message
}

export const input = ({
  message,
}: Args) => {
  const textContents = message.content.filter((c: OpenAI.Beta.Threads.Messages.TextContentBlock) => (
    c.type === 'text'
  ))

  const result = textContents.map((c: OpenAI.Beta.Threads.Messages.TextContentBlock) => (
    c.text.value
  )).join(' ')

  if (isEmpty(result)) return null

  return result
}
