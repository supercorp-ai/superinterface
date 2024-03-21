import { pick } from 'radash'
import OpenAI from 'openai'

export const serializeRunStep = ({
  runStep,
}: {
  runStep: OpenAI.Beta.Threads.Runs.RunStep
}) => (
  pick(runStep, [
    'id',
    'run_id',
    'step_details',
    'completed_at',
    'cancelled_at',
    'failed_at',
    'status',
  ])
)
