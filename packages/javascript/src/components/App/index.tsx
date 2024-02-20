import {
  Box,
} from '@radix-ui/themes'
import {
  ThreadMessages,
  ThreadMessageForm,
} from '@superinterface/react'
import { Providers } from '@/components/Providers'
import { useCurrentConversationId } from '@/hooks/conversations/useCurrentConversationId'
import { Dialog } from './Dialog'
import './styles.css'

const assistantId = 'ea811802-7914-4740-930c-fb820c6900e8'

export const App = () => {
  const { currentConversationId } = useCurrentConversationId()

  return (
    <Box className="superinterface">
      <Providers>
        <Dialog>
          <ThreadMessages
            conversationId={currentConversationId}
            assistantId={assistantId}
          />
          <ThreadMessageForm
            conversationId={currentConversationId}
            assistantId={assistantId}
          />
        </Dialog>
      </Providers>
    </Box>
  )
}
