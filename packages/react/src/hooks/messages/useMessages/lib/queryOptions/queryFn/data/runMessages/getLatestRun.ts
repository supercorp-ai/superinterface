import OpenAI from 'openai'

type Args = {
  threadId: string
  client: OpenAI
}

export const getLatestRun = async ({
  threadId,
  client,
}: Args) => {
  const runsResponse = await client.beta.threads.runs.list(threadId, {
    limit: 1,
  })

  return runsResponse.data[0]
}
