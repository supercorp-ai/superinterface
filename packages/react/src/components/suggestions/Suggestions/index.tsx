import { useMemo } from 'react'
import {
  Grid,
} from '@radix-ui/themes'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'
import { Suggestion } from './Suggestion'

type Args = {
  emptyStateSuggestions?: string[]
  suggestions?: string[]
  [key: string]: any
}

export const Suggestions = ({
  emptyStateSuggestions = [],
  suggestions = [],
  ...args
}: Args) => {
  const latestMessageProps = useLatestMessage(args)
  const isRunActiveProps = useIsRunActive(args)

  const isDisabled = useMemo(() => (
    // @ts-ignore-next-line
    latestMessageProps.latestMessage?.metadata?.isBlocking ||
      isRunActiveProps.isRunActive
  ), [latestMessageProps, isRunActiveProps])

  if (latestMessageProps.isLoading) return null
  if (isDisabled) return null

  if (!latestMessageProps.latestMessage && emptyStateSuggestions.length > 0) {
    return (
      <Grid
        columns={{
          initial: "1",
          md: "2",
        }}
        gap="2"
        py="2"
      >
        {emptyStateSuggestions.map((suggestion) => (
          <Suggestion
            key={suggestion}
            suggestion={suggestion}
            {...args}
          />
        ))}
      </Grid>
    )
  }

  if (latestMessageProps.latestMessage.role === 'assistant') {
    return (
      <Grid
        columns={{
          initial: "3",
          md: "4",
        }}
        gap="2"
        py="2"
      >
        {suggestions.map((suggestion) => (
          <Suggestion
            key={suggestion}
            suggestion={suggestion}
            {...args}
          />
        ))}
      </Grid>
    )
  }

  return null
}
