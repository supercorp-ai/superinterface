import OpenAI from 'openai'
import {
  Flex,
} from '@radix-ui/themes'

type Args = {
  codeInterpreter: OpenAI.Beta.Threads.Runs.CodeInterpreterToolCall.CodeInterpreter
  runStep: OpenAI.Beta.Threads.Runs.RunStep
}

export const CodeInterpreter = ({
  codeInterpreter,
}: Args) => (
  <Flex>
    {codeInterpreter.input}
  </Flex>
)
