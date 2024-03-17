import OpenAI from 'openai'
import { Stream } from 'openai/streaming'
import { Run } from '@/types'
import { defaultClient } from '@/lib/ai'

export type Args = {
  client?: typeof defaultClient
  threadId: string
  assistantId: string
} & (OpenAI.Beta.Threads.Runs.RunCreateParams | {})

export type Response = Run | Stream<OpenAI.Beta.Assistants.AssistantStreamEvent>

export const createRunMutationFn = ({
  client = defaultClient,
  threadId,
  assistantId,
  ...rest
}: Args): Promise<Response> => (
  client.beta.threads.runs.create(threadId, {
    ...rest,
    assistant_id: assistantId,
  })
)
