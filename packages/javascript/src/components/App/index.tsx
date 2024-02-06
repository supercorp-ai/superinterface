import {
  Box,
} from '@radix-ui/themes'
import {
  Messages,
  Form,
} from '@superinterface/react'
import { Providers } from '@/components/Providers'
import { Dialog } from './Dialog'
import './styles.css'

export const App = () => (
  <Box className="superinterface">
    <Providers>
      <Dialog>
        <Messages />
        <Form />
      </Dialog>
    </Providers>
  </Box>
)
