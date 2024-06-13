'use client'
import { useContext } from 'react'
import {
  Flex,
} from '@radix-ui/themes'
import { UserAvatarContext } from '@/contexts/users/UserAvatarContext'

export const UserAvatar = () => {
  const UserAvatarContextValue = useContext(UserAvatarContext)

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
      {UserAvatarContextValue}
    </Flex>
  )
}
