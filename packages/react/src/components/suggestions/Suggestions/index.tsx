import { useMemo } from 'react'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { Content } from './Content'
import { Item } from './Item'

export const Suggestions = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const latestMessageProps = useLatestMessage()

  const isDisabled = useMemo(() => (
    // @ts-ignore-next-line
    latestMessageProps.latestMessage?.metadata?.isBlocking
  ), [latestMessageProps])

  if (latestMessageProps.isLoading) return null
  if (isDisabled) return null

  return (
    <Content>
      {children}
    </Content>
  )
}

Suggestions.Item = Item
