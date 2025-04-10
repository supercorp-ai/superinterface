import { createRoot } from 'react-dom/client'
import {
  Thread,
  MarkdownProvider,
  SourceAnnotation,
} from '@superinterface/react'
import { rootElement } from '@superinterface/root-element'
import { Providers } from '@/components/Providers'
import { superinterfaceContext as getSuperinterfaceContext } from '@/lib/superinterfaceContext'

const currentScript = document.currentScript
const superinterfaceContext = getSuperinterfaceContext({ currentScript })
const root = createRoot(rootElement({ currentScript }))

root.render(
  <Providers superinterfaceContext={superinterfaceContext}>
    <MarkdownProvider
      components={{
        annotation: SourceAnnotation,
      }}
    >
      <Thread />
    </MarkdownProvider>
  </Providers>
)
