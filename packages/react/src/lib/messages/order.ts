import { sort } from 'radash'
import { SerializedMessage } from '@/types'

type Args = {
  messages: SerializedMessage[]
}

export const order = ({ messages }: Args) =>
  sort(messages, m => m.created_at, true)
