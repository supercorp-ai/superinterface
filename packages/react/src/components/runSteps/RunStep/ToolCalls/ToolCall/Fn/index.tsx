'use client'
import { useContext } from 'react'
import OpenAI from 'openai'
import type { SerializedRunStep } from '@/types'
// import { Availabilities } from './Availabilities'
// import { Scores } from './Scores'
import { FunctionComponentsContext } from '@/contexts/functions/FunctionComponentsContext'
import { DefaultFunction } from './DefaultFunction'

type Args = {
  fn: OpenAI.Beta.Threads.Runs.FunctionToolCall.Function
  runStep: SerializedRunStep
}

export const Fn = ({
  fn,
  runStep,
}: Args) => {
  const functionComponentsContext = useContext(FunctionComponentsContext)
  const Component = functionComponentsContext[fn.name] || DefaultFunction

  return (
    // @ts-ignore-next-line
    <Component
      fn={fn}
      runStep={runStep}
    />
  )
}
