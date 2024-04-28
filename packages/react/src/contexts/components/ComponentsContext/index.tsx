'use client'
import { createContext } from 'react'
import { RunStep } from '@/components/runSteps/RunStep'

export const ComponentsContext = createContext({
  components: {
    RunStep,
  },
})
