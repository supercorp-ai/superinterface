import { RunsPage } from '@/types'
import { defaultClient } from '@/lib/ai'

type Args = {
  client?: typeof defaultClient
  threadId: string
}

export const queryFn = async ({
  client = defaultClient,
  threadId,
}: Args): Promise<RunsPage> => {
  const response = await client.beta.threads.runs.list(threadId, {
    limit: 1,
  })

  return {
    // @ts-ignore-next-line
    data: response.data,
    hasNextPage: response.hasNextPage(),
    // @ts-ignore-next-line
    lastId: response.body.last_id,
  }
}
