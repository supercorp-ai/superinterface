import {
  AudioThreadDialog,
  ThreadDialog,
} from '@superinterface/react'
import { Providers } from '@/components/Providers'
import './styles.css'

export const App = () => (
  <Providers>
    {false && <ThreadDialog />}
    <AudioThreadDialog />
  </Providers>
)
