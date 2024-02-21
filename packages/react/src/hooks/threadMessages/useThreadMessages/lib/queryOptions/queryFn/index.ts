import _ from 'lodash'
import { defaultClient } from '@/lib/ai'
import { ThreadMessagesPage } from '@/types'
import { data } from './data'
import { messagesLimit } from './messagesLimit'
import { hasNextPage } from './hasNextPage'

type Args = {
  client?: typeof defaultClient
  threadId: string
  pageParam?: string
}

export const queryFn = async ({
  client = defaultClient,
  threadId,
  pageParam,
}: Args): Promise<ThreadMessagesPage> => {
  const threadMessagesResponse = await client.beta.threads.messages.list(threadId, {
    ...(pageParam ? { after: pageParam } : {}),
    limit: messagesLimit,
  })

  return {
    data: await data({
      client,
      threadMessagesResponse,
      pageParam,
      threadId,
    }),
    hasNextPage: hasNextPage({ threadMessagesResponse }),
    // @ts-ignore-next-line
    lastId: threadMessagesResponse.body.last_id,
  }
}
