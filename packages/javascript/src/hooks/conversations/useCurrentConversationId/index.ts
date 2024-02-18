import { useCookie } from 'react-use'

export const useCurrentConversationId = () => {
  const [currentConversationId, updateCurrentConversationId] = useCookie('superinterface-conversation-id')

  return {
    currentConversationId,
    updateCurrentConversationId,
  }
}
