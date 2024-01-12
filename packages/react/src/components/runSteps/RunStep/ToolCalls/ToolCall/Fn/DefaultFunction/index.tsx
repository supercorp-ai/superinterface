import OpenAI from 'openai'
import { FunctionBase } from '@/components/functions/FunctionBase'
import { title } from './lib/title'

type Args = {
  fn: OpenAI.Beta.Threads.Runs.FunctionToolCall.Function
  runStep: OpenAI.Beta.Threads.Runs.RunStep
}

export const DefaultFunction = ({
  fn,
  runStep,
}: Args) => (
  <FunctionBase
    fn={fn}
    runStep={runStep}
    title={title({ runStep, fn })}
  />
)
