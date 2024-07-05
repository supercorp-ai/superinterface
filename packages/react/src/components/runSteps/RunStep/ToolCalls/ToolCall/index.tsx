import { Fn } from './Fn'
import { CodeInterpreter } from './CodeInterpreter'
import { FileSearch } from './FileSearch'
import { Fallback } from './Fallback'
import type { SerializedRunStep, ToolCall as ToolCallType } from '@/types'

type Args = {
  toolCall: ToolCallType
  runStep: SerializedRunStep
}

export const ToolCall = ({
  toolCall,
  runStep,
}: Args) => {
  if (toolCall.type === 'function') {
    return (
      <Fn
        fn={toolCall.function}
        runStep={runStep}
      />
    )
  }

  if (toolCall.type === 'code_interpreter') {
    return (
      <CodeInterpreter
        toolCall={toolCall}
        runStep={runStep}
      />
    )
  }

  if (toolCall.type === 'file_search') {
    return (
      <FileSearch
        toolCall={toolCall}
        runStep={runStep}
      />
    )
  }

  return (
    <Fallback
      toolCall={toolCall}
      runStep={runStep}
    />
  )
}
