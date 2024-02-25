import _ from 'lodash'
import { last } from 'radash'
import { ThreadMessage, ThreadMessageGroup } from '@/types'
import { order } from '@/lib/threadMessages/order'
import { newGroup } from './newGroup'

type Args = {
  threadMessages: ThreadMessage[]
}

export const threadMessageGroups = ({
  threadMessages,
}: Args) =>
  _.reduce(
    order({ threadMessages }),
    (groups: ThreadMessageGroup[], threadMessage: ThreadMessage) => {
      const group = last(groups)

      if (!group) return newGroup({ groups, threadMessage })

      if (group.role !== threadMessage.role) {
        return newGroup({
          groups,
          threadMessage,
        })
      }

      return [
        ..._.dropRight(groups),
        {
          ...group,
          threadMessages: [...group.threadMessages, threadMessage],
        },
      ]
    },
    []
  )
