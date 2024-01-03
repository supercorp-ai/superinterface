import { Message, MessageGroup } from '@/types'
import { newGroupItem } from './newGroupItem'

type Args = {
  groups: MessageGroup[]
  message: Message
}

export const newGroup = ({ groups, message }: Args) => [
  ...groups,
  newGroupItem({
    message,
  }),
]
