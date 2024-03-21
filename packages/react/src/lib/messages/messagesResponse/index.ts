import _ from 'lodash'
import OpenAI from 'openai'
import { MessagesPage } from '@/types'
import { data } from './data'
import { limit } from './limit'
import { hasNextPage } from './hasNextPage'

type Args = {
  client: OpenAI
  threadId: string
  pageParam?: string
}

export const messagesResponse = async ({
  client,
  threadId,
  pageParam,
}: Args): Promise<MessagesPage> => {
  const messagesResponse = await client.beta.threads.messages.list(threadId, {
    ...(pageParam ? { after: pageParam } : {}),
    limit,
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
