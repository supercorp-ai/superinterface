import { createRoot } from 'react-dom/client'
import {
  ThreadDialog,
} from '@superinterface/react'
import { rootElement } from '@/lib/rootElement'
import { Providers } from '@/components/Providers'

window.superinterface = window.superinterface || {};
window.superinterface.publicApiKey = "dc703d26-e6dd-4528-8a2f-2f2ea41af366";
window.superinterface.assistantId = "3cac8ac7-ca54-4be8-b769-f69cf9174196";

const root = createRoot(rootElement())

root.render(
  <Providers>
    <ThreadDialog />
  </Providers>
)
