import { useMemo } from 'react'
import { Code, Box } from '@radix-ui/themes'
import OpenAI from 'openai'

type Args = {
  fn: OpenAI.Beta.Threads.Runs.FunctionToolCall.Function
}

export const Content = ({
  fn,
}: Args) => {
  const args = useMemo(() => {
    let result = null

    try {
      result = JSON.parse(fn.arguments)
    } catch (error) {
      console.error(error)
    }

    return result
  }, [fn])

  const output = useMemo(() => {
    if (!fn.output) {
      return null
    }

    let result = null

    try {
      result = JSON.parse(fn.output)
    } catch (error) {
      console.error(error)
    }

    return result
  }, [fn])

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
        {args && JSON.stringify(args, null, 2)}
      </Box>
      <Box>
        {output && JSON.stringify(output, null, 2)}
      </Box>
    </Code>
  )
}
