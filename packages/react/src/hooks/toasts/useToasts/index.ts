import { useContext } from 'react'
import { ToastsContext } from '@/contexts/toasts/ToastsContext'

export const useToasts = () => (
  useContext(ToastsContext)
)
