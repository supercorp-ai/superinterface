import OpenAI from 'openai'
import { Flex } from '@radix-ui/themes'
import { RunStep } from '@/components/runSteps/RunStep'

type Args = {
  runSteps: OpenAI.Beta.Threads.Runs.RunStep[]
}

export const RunSteps = ({
  runSteps,
}: Args) => (
  <Flex
    direction="column-reverse"
  >
    {runSteps.map((runStep) => (
      <RunStep
        key={runStep.id}
        runStep={runStep}
      />
    ))}
  </Flex>
)
