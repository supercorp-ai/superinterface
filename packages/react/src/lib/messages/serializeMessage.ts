import OpenAI from 'openai'
import { serializeRunStep } from '@/lib/runSteps/serializeRunStep'

export const serializeMessage = ({
  message,
}: {
  message: OpenAI.Beta.Threads.Messages.Message & {
    runSteps?: OpenAI.Beta.Threads.Runs.RunStep[]
  }
}) => ({
  id: message.id,
  role: message.role,
  created_at: message.created_at,
  content: message.content,
  run_id: message.run_id,
  assistant_id: message.assistant_id,
  thread_id: message.thread_id,
  attachments: message.attachments,
  metadata: message.metadata,
  runSteps: (message.runSteps ?? []).map((runStep) => (
    serializeRunStep({ runStep })
  )),
  status: message.status,
})
