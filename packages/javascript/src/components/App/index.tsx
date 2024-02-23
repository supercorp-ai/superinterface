import {
  ThreadDialog,
} from '@superinterface/react'
import { Providers } from '@/components/Providers'
import { ThemeProvider } from '@/components/ThemeProvider'
import './styles.css'

export const App = () => (
  <Providers>
    <ThemeProvider>
      <ThreadDialog />
    </ThemeProvider>
  </Providers>
)
