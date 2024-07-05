import { useContext } from 'react'
import { AssistantContext } from '@/contexts/assistants/AssistantContext'

export const useAssistantContext = () => (
  useContext(AssistantContext)
)
