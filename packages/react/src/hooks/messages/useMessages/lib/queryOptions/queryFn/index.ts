import _ from 'lodash'
import { client } from '@/lib/ai'
import { MessagesPage } from '@/types'
import { data } from './data'
import { messagesLimit } from './messagesLimit'
import { hasNextPage } from './hasNextPage'

type Args = {
  threadId: string
  pageParam?: string
}

export const queryFn = async ({
  threadId,
  pageParam,
}: Args): Promise<MessagesPage> => {
  const messagesResponse = await client.beta.threads.messages.list(threadId, {
    ...(pageParam ? { after: pageParam } : {}),
    limit: messagesLimit,
  })

  return {
    data: await data({
      messagesResponse,
      pageParam,
      threadId,
    }),
    hasNextPage: hasNextPage({ messagesResponse }),
    // @ts-ignore-next-line
    lastId: messagesResponse.body.last_id,
  }
}
