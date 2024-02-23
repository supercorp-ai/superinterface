import OpenAI from 'openai'
import { ThreadMessage } from '@/types'
import { getLatestRun } from './getLatestRun'
import { extendThreadMessage } from '@/lib/threadMessages/extendThreadMessage'
import { optimisticId } from '@/lib/optimistic/optimisticId'

type Args = {
  threadMessages: ThreadMessage[]
  threadId: string
  client: OpenAI
}

export const runThreadMessages = async ({
  threadMessages,
  threadId,
  client,
}: Args) => {
  const latestRun = await getLatestRun({ threadId, client })

  if (!latestRun) {
    return []
  }

  const threadMessageFromLatestRun = threadMessages.find(m => m.run_id === latestRun.id)

  if (threadMessageFromLatestRun) {
    return []
  }

  return [
    await extendThreadMessage({
      threadMessage: {
        id: optimisticId(),
        role: 'assistant' as OpenAI.Beta.Threads.Messages.ThreadMessage['role'],
        created_at: +new Date(),
        object: 'thread.message' as OpenAI.Beta.Threads.Messages.ThreadMessage['object'],
        content: [],
        run_id: latestRun.id,
        assistant_id: latestRun.assistant_id,
        thread_id: latestRun.thread_id,
        file_ids: [],
        metadata: {},
      },
      client,
    }),
  ]
}
