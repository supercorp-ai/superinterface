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
      <Thread.Root>
        <Thread.Messages />
        <Thread.MessageForm.Root>
          <Thread.MessageForm.Field.Root>
            <Thread.MessageForm.Field.Files.Preview />
            <Thread.MessageForm.Field.Files.Control />
            <Thread.MessageForm.Field.Control />
            <Thread.MessageForm.Submit />
          </Thread.MessageForm.Field.Root>
        </Thread.MessageForm.Root>
      </Thread.Root>
    </MarkdownProvider>
  </Providers>
)
