import {
  Messages,
} from '@superinterface/react'
import { Provider } from '@/components/Provider'

export const App = () => (
  <Provider>
    This is Superinterface
    <Messages />
  </Provider>
)
