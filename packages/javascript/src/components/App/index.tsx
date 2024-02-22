import {
  Box,
} from '@radix-ui/themes'
import {
  ThreadProvider,
  ThreadMessages,
  ThreadMessageForm,
} from '@superinterface/react'
import { Providers } from '@/components/Providers'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Dialog } from './Dialog'
import './styles.css'

export const App = () => (
  <Providers>
    <ThreadProvider
      variables={{
        assistantId: 'ea811802-7914-4740-930c-fb820c6900e8',
      }}
    >
      <ThemeProvider>
        <Box className="superinterface">
          <Dialog>
            <ThreadMessages />
            <ThreadMessageForm />
          </Dialog>
        </Box>
      </ThemeProvider>
    </ThreadProvider>
  </Providers>
)
