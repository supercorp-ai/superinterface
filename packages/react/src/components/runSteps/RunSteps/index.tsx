import { Flex } from '@radix-ui/themes'
import type { SerializedRunStep } from '@/types'
import { RunStep } from '@/components/runSteps/RunStep'

type Args = {
  runSteps: SerializedRunStep[]
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
