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
          <ThreadProvider
            variables={{
              assistantId: 'ea811802-7914-4740-930c-fb820c6900e8',
              conversationId: '310a2cde-ed4e-49b2-8efc-7fc912f48f91',
            }}
          >
            <ThreadMessages />
            <ThreadMessageForm />
          </ThreadProvider>
        </Dialog>
      </Providers>
    </Box>
  )
}
