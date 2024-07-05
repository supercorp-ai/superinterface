import { createRoot } from 'react-dom/client'
import {
  ThreadDialog,
  Thread,
} from '@superinterface/react'
import { rootElement } from '@/lib/rootElement'
import { Providers } from '@/components/Providers'

const root = createRoot(rootElement())

root.render(
  <Providers>
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
  </Providers>
)
