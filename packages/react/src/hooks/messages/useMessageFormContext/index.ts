import { useContext } from 'react'
import { MessageFormContext } from '@/contexts/messages/MessageFormContext'

export const useMessageFormContext = () => (
  useContext(MessageFormContext)
)
