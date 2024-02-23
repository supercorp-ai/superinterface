'use client'
import { createContext, Dispatch, SetStateAction } from 'react'

export const ThreadDialogContext = createContext<{
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
}>({
  isOpen: false,
  setIsOpen: () => {},
})
