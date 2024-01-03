import { RunsPage } from '@/types'
import { client } from '@/lib/ai'

type Args = {
  threadId: string
}

export const queryFn = async ({
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
