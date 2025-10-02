import type OpenAI from 'openai'
import { isEmpty } from 'radash'
import { SerializedMessage } from '@/types'

type Args = {
  message: SerializedMessage
}

export const input = ({ message }: Args) => {
  const textContents = (
    message.content as OpenAI.Beta.Threads.Messages.TextContentBlock[]
  ).filter(
    (c: OpenAI.Beta.Threads.Messages.TextContentBlock) => c.type === 'text',
  )

  const result = textContents
    .map((c: OpenAI.Beta.Threads.Messages.TextContentBlock) => c.text.value)
    .join(' ')

  if (isEmpty(result)) return null

  return result
}
