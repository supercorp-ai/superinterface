'use client'
import { useContext } from 'react'
import OpenAI from 'openai'
import type { SerializedRunStep } from '@/types'
import { FunctionComponentsContext } from '@/contexts/functions/FunctionComponentsContext'
import { ComponentsContext } from '@/contexts/components/ComponentsContext'

type Args = {
  fn: OpenAI.Beta.Threads.Runs.FunctionToolCall.Function
  runStep: SerializedRunStep
}

export const Fn = ({
  fn,
  runStep,
}: Args) => {
  const functionComponentsContext = useContext(FunctionComponentsContext)
  const componentsContext = useContext(ComponentsContext)
  const Component = functionComponentsContext[fn.name] || componentsContext.components.Function

  return (
    // @ts-ignore-next-line
    <Component
      fn={fn}
      runStep={runStep}
    />
  )
}
