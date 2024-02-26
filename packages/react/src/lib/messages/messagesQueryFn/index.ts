import _ from 'lodash'
import { defaultClient } from '@/lib/ai'
import { MessagesPage } from '@/types'
import { data } from './data'
import { messagesLimit } from './messagesLimit'
import { hasNextPage } from './hasNextPage'

type Args = {
  client?: typeof defaultClient
  threadId: string
  pageParam?: string
}

export const messagesQueryFn = async ({
  client = defaultClient,
  threadId,
  pageParam,
}: Args): Promise<MessagesPage> => {
  const messagesResponse = await client.beta.threads.messages.list(threadId, {
    ...(pageParam ? { after: pageParam } : {}),
    limit: messagesLimit,
  })

  return {
    data: await data({
      client,
      messagesResponse,
      pageParam,
      threadId,
    }),
    hasNextPage: hasNextPage({ messagesResponse }),
    // @ts-ignore-next-line
    lastId: messagesResponse.body.last_id,
  }
}
