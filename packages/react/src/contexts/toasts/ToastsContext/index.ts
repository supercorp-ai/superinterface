'use client'
import { createContext } from 'react'
import { Toast } from '@/types'

export const ToastsContext = createContext<{
  toasts: Toast[]
  addToast: (toast: Toast) => void
}>({
  toasts: [],
  addToast: () => {},
})
