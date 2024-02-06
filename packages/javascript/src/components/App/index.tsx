import {
  Messages,
  Form,
} from '@superinterface/react'
import { Providers } from '@/components/Providers'
import { Dialog } from './Dialog'
import './styles.css'

export const App = () => (
  <Providers>
    <Dialog>
      <Messages />
      <Form />
    </Dialog>
  </Providers>
)
