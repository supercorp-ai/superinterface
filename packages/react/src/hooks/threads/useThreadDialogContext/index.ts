import { useContext } from 'react'
import { ThreadDialogContext } from '@/contexts/threads/ThreadDialogContext'

export const useThreadDialogContext = () => (
  useContext(ThreadDialogContext)
)
