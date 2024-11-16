'use client'
import { createContext } from 'react'
import { SerializedMessage } from '@/types'

export const MessageContext = createContext<{
  message: SerializedMessage | null
}>({
  message: null,
})
