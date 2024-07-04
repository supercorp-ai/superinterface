'use client'
import { createContext } from 'react'

export const MessageFormContext = createContext({
  isDisabled: false,
  isLoading: false,
  files: [] as File[],
  setFiles: (() => {}) as any,
})
