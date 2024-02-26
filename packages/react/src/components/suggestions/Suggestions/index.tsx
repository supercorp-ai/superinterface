import { useMemo } from 'react'
import {
  Flex,
} from '@radix-ui/themes'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'
import { Suggestion } from '@/components/suggestions/Suggestion'

type Args = {
  emptyStateSuggestions?: string[]
  suggestions?: string[]
}

export const Suggestions = ({
  emptyStateSuggestions = [],
  suggestions = [],
}: Args) => {
  const latestMessageProps = useLatestMessage()
  const isRunActiveProps = useIsRunActive()

  const isDisabled = useMemo(() => (
    // @ts-ignore-next-line
    latestMessageProps.latestMessage?.metadata?.isBlocking ||
      isRunActiveProps.isRunActive
  ), [latestMessageProps, isRunActiveProps])

  if (latestMessageProps.isLoading) return null
  if (isDisabled) return null

  if (!latestMessageProps.latestMessage && emptyStateSuggestions.length > 0) {
    return (
      <Flex
        gap="2"
        py="2"
        wrap="wrap"
      >
        {emptyStateSuggestions.map((suggestion) => (
          <Suggestion
            key={suggestion}
            suggestion={suggestion}
          />
        ))}
      </Flex>
    )
  }

  if (latestMessageProps.latestMessage.role === 'assistant') {
    return (
      <Flex
        gap="2"
        py="2"
        wrap="wrap"
      >
        {suggestions.map((suggestion) => (
          <Suggestion
            key={suggestion}
            suggestion={suggestion}
          />
        ))}
      </Flex>
    )
  }

  return null
}
