import { createRoot } from 'react-dom/client'
import {
  AudioThreadDialog,
} from '@superinterface/react'
import { rootElement } from '@/lib/rootElement'
import { Providers } from '@/components/Providers'

const root = createRoot(rootElement())

root.render(
  <Providers>
    <AudioThreadDialog />
  </Providers>
)
