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
      shrink="0"
      style={{
        borderRadius: 'var(--radius-3)',
        overflow: 'hidden',
        height: '24px',
        width: '24px',
      }}
    >
      {AssistantAvatarContextValue}
    </Flex>
  )
}
