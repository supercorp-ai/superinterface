'use client'
import { useContext } from 'react'
import {
  Flex,
} from '@radix-ui/themes'
import { AssistantAvatarContext } from '@/contexts/avatars/AssistantAvatarContext'

export const AssistantAvatar = () => {
  const AssistantAvatarContextValue = useContext(AssistantAvatarContext)

  return (
    <Flex
      shrink="0"
      className="rounded-3 overflow-hidden h-[24px] w-[24px]"
    >
      {AssistantAvatarContextValue}
    </Flex>
  )
}
