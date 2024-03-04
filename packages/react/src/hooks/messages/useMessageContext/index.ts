import { useContext } from 'react'
import { MessageContext } from '@/contexts/messages/MessageContext'

export const useMessageContext = () => (
  useContext(MessageContext)
)
