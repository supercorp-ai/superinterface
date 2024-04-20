import OpenAI from 'openai'
import {
  Flex,
} from '@radix-ui/themes'
import type { SerializedRunStep } from '@/types'

type Args = {
  codeInterpreter: OpenAI.Beta.Threads.Runs.CodeInterpreterToolCall.CodeInterpreter
  runStep: SerializedRunStep
}

export const CodeInterpreter = ({
  codeInterpreter,
}: Args) => (
  <Flex>
    {codeInterpreter.input}
  </Flex>
)
