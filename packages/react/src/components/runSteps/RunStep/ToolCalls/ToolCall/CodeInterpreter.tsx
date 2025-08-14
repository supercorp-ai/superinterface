'use client'
import OpenAI from 'openai'
import { useContext } from 'react'
import type { SerializedRunStep } from '@/types'
import { ComponentsContext } from '@/contexts/components/ComponentsContext'

export const CodeInterpreter = ({
  codeInterpreter,
  runStep,
  toolCall,
}: {
  codeInterpreter: OpenAI.Beta.Threads.Runs.CodeInterpreterToolCall.CodeInterpreter
  runStep: SerializedRunStep
  toolCall: OpenAI.Beta.Threads.Runs.CodeInterpreterToolCall
}) => {
  const componentsContext = useContext(ComponentsContext)
  const Component = componentsContext.components.CodeInterpreterToolCall

  return (
    <Component
      codeInterpreter={codeInterpreter}
      runStep={runStep}
      toolCall={toolCall}
    />
  )
}
