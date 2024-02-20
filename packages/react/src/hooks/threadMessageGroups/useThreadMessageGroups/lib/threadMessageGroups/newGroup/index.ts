import { ThreadMessage, ThreadMessageGroup } from '@/types'
import { newGroupItem } from './newGroupItem'

type Args = {
  groups: ThreadMessageGroup[]
  threadMessage: ThreadMessage
}

export const newGroup = ({ groups, threadMessage }: Args) => [
  ...groups,
  newGroupItem({
    threadMessage,
  }),
]
