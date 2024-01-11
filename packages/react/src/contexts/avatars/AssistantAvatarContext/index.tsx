'use client'
import { createContext } from 'react'
import {
  Avatar,
} from '@radix-ui/themes'
import {
  LightningBoltIcon,
} from '@radix-ui/react-icons'

export const AssistantAvatarContext = createContext(
  <Avatar
    fallback={<LightningBoltIcon />}
    size="1"
  />
)
