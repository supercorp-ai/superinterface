import { createRoot } from 'react-dom/client'
import {
  ThreadDialog,
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
      <ThreadDialog.Root>
        <ThreadDialog.Content.Root>
          <Thread.Root>
            <ThreadDialog.Content.Messages />
            <ThreadDialog.Content.FormContainer>
              <Thread.MessageForm.Root>
                <Thread.MessageForm.Field.Root>
                  <Thread.MessageForm.Field.Files.Preview />
                  <Thread.MessageForm.Field.Files.Control />
                  <Thread.MessageForm.Field.Control />
                  <Thread.MessageForm.Submit />
                </Thread.MessageForm.Field.Root>
              </Thread.MessageForm.Root>
            </ThreadDialog.Content.FormContainer>
          </Thread.Root>
        </ThreadDialog.Content.Root>
        <ThreadDialog.Trigger />
      </ThreadDialog.Root>
    </MarkdownProvider>
  </Providers>
)
