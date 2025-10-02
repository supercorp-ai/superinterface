import { pick } from 'radash'
import type OpenAI from 'openai'

export const serializeRun = ({ run }: { run: OpenAI.Beta.Threads.Runs.Run }) =>
  pick(run, ['id', 'thread_id', 'assistant_id', 'created_at'])
