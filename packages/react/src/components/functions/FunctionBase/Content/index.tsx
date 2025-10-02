import { useMemo } from 'react'
import { Code, Box } from '@radix-ui/themes'
import type OpenAI from 'openai'
import { formattedJsonOrRaw } from './lib/formattedJsonOrRaw'

type Args = {
  fn: OpenAI.Beta.Threads.Runs.FunctionToolCall.Function
}

export const Content = ({ fn }: Args) => {
  const args = useMemo(
    () =>
      formattedJsonOrRaw({
        value: fn.arguments,
      }),
    [fn],
  )

  const output = useMemo(
    () =>
      formattedJsonOrRaw({
        value: fn.output,
      }),
    [fn],
  )

  return (
    <Code
      variant="ghost"
      color="gold"
      style={{
        whiteSpace: 'pre',
        wordBreak: 'break-word',
      }}
    >
      {args && <Box>{args}</Box>}
      {output && <Box>{output}</Box>}
    </Code>
  )
}
