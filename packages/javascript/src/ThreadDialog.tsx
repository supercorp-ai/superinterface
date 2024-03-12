import { createRoot } from 'react-dom/client'
import {
  ThreadDialog,
} from '@superinterface/react'
import { rootElement } from '@/lib/rootElement'
import { Providers } from '@/components/Providers'

const root = createRoot(rootElement())

root.render(
  <Providers>
    <ThreadDialog />
  </Providers>
)
