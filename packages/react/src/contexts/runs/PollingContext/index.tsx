'use client'
import { createContext } from 'react'

export const PollingContext = createContext<{
  isPollRefetching: boolean
  setIsPollRefetching: (isPollRefetching: boolean) => void
}>({
  isPollRefetching: false,
  setIsPollRefetching: () => {},
})
