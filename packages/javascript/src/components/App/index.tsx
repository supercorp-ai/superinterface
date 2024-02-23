import {
  ThreadDialog,
} from '@superinterface/react'
import { Providers } from '@/components/Providers'
import './styles.css'

export const App = () => (
  <Providers>
    <ThreadDialog />
  </Providers>
)
