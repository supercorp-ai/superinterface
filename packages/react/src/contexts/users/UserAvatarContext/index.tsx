'use client'
import { createContext } from 'react'
import {
  Avatar,
} from '@radix-ui/themes'
import {
  PersonIcon,
} from '@radix-ui/react-icons'

export const UserAvatarContext = createContext(
  <Avatar
    fallback={<PersonIcon />}
    size="1"
  />
)
