import {
  Box,
} from '@radix-ui/themes'
import {
  ThreadProvider,
  ThreadMessages,
  ThreadMessageForm,
} from '@superinterface/react'
import { Providers } from '@/components/Providers'
import { Dialog } from './Dialog'
import './styles.css'

export const App = () => (
  <Box className="superinterface">
    <Providers>
      <Dialog>
        <ThreadProvider
          variables={{
            assistantId: 'ea811802-7914-4740-930c-fb820c6900e8',
          }}
        >
          <ThreadMessages />
          <ThreadMessageForm />
        </ThreadProvider>
      </Dialog>
    </Providers>
  </Box>
)
