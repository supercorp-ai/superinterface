'use client'
import OpenAI from 'openai'
import { useContext } from 'react'
import type { SerializedRunStep } from '@/types'
import { ComponentsContext } from '@/contexts/components/ComponentsContext'

export const CodeInterpreter = ({
  codeInterpreter,
  runStep,
}: {
  codeInterpreter: OpenAI.Beta.Threads.Runs.CodeInterpreterToolCall.CodeInterpreter
  runStep: SerializedRunStep
}) => {
  const componentsContext = useContext(ComponentsContext)
  const Component = componentsContext.components.CodeInterpreterToolCall

  return (
    <Component
      codeInterpreter={codeInterpreter}
      runStep={runStep}
    />
  )
}
