import type OpenAI from 'openai'
import { textContent } from '@/lib/messages/textContent'

export const messagesToOutput = ({
  messages,
}: {
  messages: OpenAI.Beta.Threads.Messages.Message[]
}) => messages.map((message) => textContent({ message })).join('\n\n')
