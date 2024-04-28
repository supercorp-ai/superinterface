import { Flex } from '@radix-ui/themes'
import { useContext } from 'react'
import type { SerializedRunStep } from '@/types'
import { ComponentsContext } from '@/contexts/components/ComponentsContext'

type Args = {
  runSteps: SerializedRunStep[]
}

export const RunSteps = ({
  runSteps,
}: Args) => {
  const componentsContext = useContext(ComponentsContext)
  const Component = componentsContext.components.RunStep

  return (
    <Flex
      direction="column-reverse"
    >
      {runSteps.map((runStep) => (
        <Component
          key={runStep.id}
          runStep={runStep}
        />
      ))}
    </Flex>
  )
}
