'use client'
import { useContext } from 'react'
import {
  Flex,
} from '@radix-ui/themes'
import { AssistantAvatarContext } from '@/contexts/assistants/AssistantAvatarContext'

export const AssistantAvatar = () => {
  const AssistantAvatarContextValue = useContext(AssistantAvatarContext)

  return (
    <Flex
      flexShrink="0"
      height="24px"
      width="24px"
      style={{
        borderRadius: 'var(--radius-3)',
        overflow: 'hidden',
      }}
    >
      {AssistantAvatarContextValue}
    </Flex>
  )
}
