import { useMemo } from 'react'
import { Code, Box } from '@radix-ui/themes'
import OpenAI from 'openai'
import { formattedJsonOrRaw } from './lib/formattedJsonOrRaw'

type Args = {
  fn: OpenAI.Beta.Threads.Runs.FunctionToolCall.Function
}

export const Content = ({
  fn,
}: Args) => {
  const args = useMemo(() => (
    formattedJsonOrRaw({
      value: fn.arguments,
    })
  ), [fn])

  const output = useMemo(() => (
    formattedJsonOrRaw({
      value: fn.output,
    })
  ), [fn])

  if (!args) {
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
        {args}
      </Box>
      <Box>
        {output}
      </Box>
    </Code>
  )
}
