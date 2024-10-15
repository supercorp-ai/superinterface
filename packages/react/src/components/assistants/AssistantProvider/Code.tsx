import { useMemo } from 'react'
import { useMarkdownContext } from '@/hooks/markdown/useMarkdownContext'
import { Suggestions } from '@/components/suggestions/Suggestions'
import { useMessageContext } from '@/hooks/messages/useMessageContext'

export const Code = ({
  children,
  className,
  markdownContext,
}: {
  children: string,
  className: string,
  markdownContext: ReturnType<typeof useMarkdownContext>
}) => {
  const messageContext = useMessageContext()

  const isAssistantMessage = useMemo(() => (
    messageContext.message?.role === 'assistant'
  ), [messageContext])

  if (!isAssistantMessage || className !== 'language-suggestions') {
    return markdownContext.components.code({ children, className })
  }

  return <Suggestions>{children}</Suggestions>
}
