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
  [key: string]: any
}

export const Suggestions = ({
  emptyStateSuggestions = [],
  suggestions = [],
  ...args
}: Args) => {
  const latestThreadMessageProps = useLatestThreadMessage(args)
  const isRunActiveProps = useIsRunActive(args)

  const isDisabled = useMemo(() => (
    // @ts-ignore-next-line
    latestMessageProps.latestMessage?.metadata?.isBlocking ||
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
            {...args}
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
            {...args}
          />
        ))}
      </Flex>
    )
  }

  return null
}
