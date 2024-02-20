import { useMemo } from 'react'
import {
  Flex,
} from '@radix-ui/themes'
import { useLatestThreadMessage } from '@/hooks/threadMessages/useLatestThreadMessage'
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
  const latestThreadMessageProps = useLatestThreadMessage()
  const isRunActiveProps = useIsRunActive()

  const isDisabled = useMemo(() => (
    // @ts-ignore-next-line
    latestThreadMessageProps.latestThreadMessage?.metadata?.isBlocking ||
      isRunActiveProps.isRunActive
  ), [latestThreadMessageProps, isRunActiveProps])

  if (latestThreadMessageProps.isLoading) return null
  if (isDisabled) return null

  if (!latestThreadMessageProps.latestThreadMessage && emptyStateSuggestions.length > 0) {
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

  if (latestThreadMessageProps.latestThreadMessage.role === 'assistant') {
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
