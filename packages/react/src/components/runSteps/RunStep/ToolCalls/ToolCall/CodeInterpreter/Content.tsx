import { Code, Box } from '@radix-ui/themes'
import OpenAI from 'openai'

type Args = {
  codeInterpreter: OpenAI.Beta.Threads.Runs.CodeInterpreterToolCall.CodeInterpreter
}

export const Content = ({
  codeInterpreter,
}: Args) => {
  if (!codeInterpreter.input) {
    return null
  }

  return (
    <Code
      variant="ghost"
      color="gold"
      style={{
        whiteSpace: 'pre',
        wordBreak: 'break-word',
      }}
    >
      <Box>
        {codeInterpreter.input}
      </Box>
      <Box>
        {JSON.stringify(codeInterpreter.outputs)}
      </Box>
    </Code>
  )
}
