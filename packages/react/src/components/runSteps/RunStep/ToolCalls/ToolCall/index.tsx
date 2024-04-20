import OpenAI from 'openai'
import {
  Flex,
} from '@radix-ui/themes'
import { Fn } from './Fn'
import { CodeInterpreter } from './CodeInterpreter'
import type { SerializedRunStep } from '@/types'

type ToolCall = OpenAI.Beta.Threads.Runs.CodeInterpreterToolCall
  | OpenAI.Beta.Threads.Runs.FileSearchToolCall
  | OpenAI.Beta.Threads.Runs.FunctionToolCall

type Args = {
  toolCall: ToolCall
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
        codeInterpreter={toolCall.code_interpreter}
        runStep={runStep}
      />
    )
  }

  return (
    <Flex>
      {toolCall.type}
    </Flex>
  )
}
