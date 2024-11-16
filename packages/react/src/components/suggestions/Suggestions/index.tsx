import { useMemo } from 'react'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import type { StyleProps } from '@/types'
import { Content } from './Content'
import { Item } from './Item'

export const Suggestions = ({
  children,
  className,
  style,
}: {
  children: React.ReactNode
} & StyleProps) => {
  const latestMessageProps = useLatestMessage()

  const isDisabled = useMemo(() => (
    // @ts-ignore-next-line
    latestMessageProps.latestMessage?.metadata?.isBlocking
  ), [latestMessageProps])

  if (latestMessageProps.isLoading) return null
  if (isDisabled) return null

  return (
    <Content
      className={className}
      style={style}
    >
      {children}
    </Content>
  )
}

Suggestions.Item = Item
