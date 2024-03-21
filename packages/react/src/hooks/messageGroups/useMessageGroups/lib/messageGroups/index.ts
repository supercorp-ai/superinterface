import _ from 'lodash'
import { last } from 'radash'
import { SerializedMessage, MessageGroup } from '@/types'
import { order } from '@/lib/messages/order'
import { newGroup } from './newGroup'

type Args = {
  messages: SerializedMessage[]
}

export const messageGroups = ({
  messages,
}: Args) =>
  _.reduce(
    order({ messages }),
    (groups: MessageGroup[], message: SerializedMessage) => {
      const group = last(groups)

      if (!group) return newGroup({ groups, message })

      if (group.role !== message.role) {
        return newGroup({
          groups,
          message,
        })
      }

      return [
        ..._.dropRight(groups),
        {
          ...group,
          messages: [...group.messages, message],
        },
      ]
    },
    []
  )
