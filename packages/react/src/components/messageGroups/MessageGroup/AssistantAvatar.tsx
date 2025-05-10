'use client'
import { useContext } from 'react'
import {
  Flex,
} from '@radix-ui/themes'
import { AssistantAvatarContext } from '@/contexts/assistants/AssistantAvatarContext'
import type { StyleProps } from '@/types'

type Args = {
  children?: React.ReactNode
} & StyleProps

const Root = ({
  children,
  style,
  className,
}: Args) => (
  <Flex
    flexShrink="0"
    height="24px"
    width="24px"
    className={className}
    style={{
      borderRadius: 'var(--radius-3)',
      overflow: 'hidden',
      ...style,
    }}
  >
    {children}
  </Flex>
)

export const AssistantAvatar = ({
  style,
  className,
}: StyleProps) => {
  const AssistantAvatarContextValue = useContext(AssistantAvatarContext)

  return (
    <Root
      style={style}
      className={className}
    >
      {AssistantAvatarContextValue}
    </Root>
  )
}

AssistantAvatar.Root = Root
