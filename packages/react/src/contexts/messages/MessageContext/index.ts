'use client'
import { createContext } from 'react'
import { Message } from '@/types'

export const MessageContext = createContext<{
  message: Message | null
}>({
  message: null,
})
