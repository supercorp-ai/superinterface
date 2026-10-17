import type { SerializedMessage } from '@/types'

// The text of each message, as `role: text`, newest first like the API.
export const messageTexts = ({ messages }: { messages: SerializedMessage[] }) =>
  messages.map(
    (message) =>
      `${message.role}: ${message.content
        .map((part) => (part.type === 'text' ? part.text.value : part.type))
        .join(' ')}`,
  )
