import { client } from '@/lib/ai'

type Args = {
  threadId: string
}

export const getLatestRun = async ({
  threadId,
}: Args) => {
  const runsResponse = await client.beta.threads.runs.list(threadId, {
    limit: 1,
  })

  return runsResponse.data[0]
}
