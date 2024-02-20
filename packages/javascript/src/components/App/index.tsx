import {
  Box,
} from '@radix-ui/themes'
import {
  ThreadProvider,
  ThreadMessages,
  ThreadMessageForm,
} from '@superinterface/react'
import { Providers } from '@/components/Providers'
// import { useCurrentConversationId } from '@/hooks/conversations/useCurrentConversationId'
import { Dialog } from './Dialog'
import './styles.css'

// const assistantId = 'ea811802-7914-4740-930c-fb820c6900e8'

export const App = () => {
  // const { currentConversationId } = useCurrentConversationId()

  return (
    <Box className="superinterface">
      <Providers>
        <Dialog>
          <ThreadProvider>
            <ThreadMessages
            />
            <ThreadMessageForm
            />
          </ThreadProvider>
        </Dialog>
      </Providers>
    </Box>
  )
}
            // conversationId={currentConversationId}
            // assistantId={assistantId}
            // conversationId={currentConversationId}
            // assistantId={assistantId}
