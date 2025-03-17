'use client'
import { createContext } from 'react'
import { RunStep } from '@/components/runSteps/RunStep'
import { Function } from '@/components/functions/Function'
import { StartingToolCalls } from '@/components/toolCalls/StartingToolCalls'

export const ComponentsContext = createContext({
  components: {
    RunStep,
    Function,
    StartingToolCalls,
  },
})
