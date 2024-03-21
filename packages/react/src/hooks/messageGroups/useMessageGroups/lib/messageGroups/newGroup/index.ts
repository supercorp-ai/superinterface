import { SerializedMessage, MessageGroup } from '@/types'
import { newGroupItem } from './newGroupItem'

type Args = {
  groups: MessageGroup[]
  message: SerializedMessage
}

export const newGroup = ({ groups, message }: Args) => [
  ...groups,
  newGroupItem({
    message,
  }),
]
