import OpenAI from 'openai'
import { Availabilities } from './Availabilities'
import { Scores } from './Scores'

type Args = {
  fn: OpenAI.Beta.Threads.Runs.FunctionToolCall.Function
  runStep: OpenAI.Beta.Threads.Runs.RunStep
}

export const Fn = ({
  fn,
  runStep,
}: Args) => {
  if (fn.name === 'getAvailabilities') {
    return (
      <Availabilities
        fn={fn}
        runStep={runStep}
      />
    )
  } else if (fn.name === 'getScores') {
    return (
      <Scores
        fn={fn}
        runStep={runStep}
      />
    )
  }

  return null
}
