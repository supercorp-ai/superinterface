import { sort } from 'radash'
import { ThreadMessage } from '@/types'

type Args = {
  threadMessages: ThreadMessage[]
}

export const order = ({ threadMessages }: Args) =>
  sort(threadMessages, tm => tm.created_at, true)
