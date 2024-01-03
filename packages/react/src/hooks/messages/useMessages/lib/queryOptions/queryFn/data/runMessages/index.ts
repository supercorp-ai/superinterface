import OpenAI from 'openai'
import { Message } from '@/types'
import { getLatestRun } from './getLatestRun'
import { extendMessage } from '@/lib/messages/extendMessage'
import { optimisticId } from '@/lib/optimistic/optimisticId'

type Args = {
  messages: Message[]
  threadId: string
}

export const runMessages = async ({
  messages,
  threadId,
}: Args) => {
  const latestRun = await getLatestRun({ threadId })

  if (!latestRun) {
    return []
  }

  const messageFromLatestRun = messages.find(m => m.run_id === latestRun.id)

  if (messageFromLatestRun) {
    return []
  }

  return [
    await extendMessage({
      message: {
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
    }),
  ]
}
