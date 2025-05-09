'use client'
import { useContext } from 'react'
import type { SerializedRunStep, ToolCall } from '@/types'
import { ComponentsContext } from '@/contexts/components/ComponentsContext'

export const FileSearch = ({
  toolCall,
  runStep,
}: {
  toolCall: ToolCall
  runStep: SerializedRunStep
}) => {
  const componentsContext = useContext(ComponentsContext)
  const Component = componentsContext.components.FileSearchToolCall

  return (
    <Component
      toolCall={toolCall}
      runStep={runStep}
    />
  )
}
