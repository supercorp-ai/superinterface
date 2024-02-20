import { useContext } from 'react'
import { ThreadContext } from '@/contexts/threads/ThreadContext'

export const useThreadContext = () => (
  useContext(ThreadContext)
)
