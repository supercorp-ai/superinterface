import { sort } from 'radash'
import { Message } from '@/types'

type Args = {
  messages: Message[]
}

export const order = ({ messages }: Args) =>
  sort(messages, m => m.created_at, true)
