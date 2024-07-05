import { createRoot } from 'react-dom/client'
import {
  ThreadDialog,
  Thread,
} from '@superinterface/react'
import { rootElement } from '@/lib/rootElement'
import { Providers } from '@/components/Providers'
import { useAssistantContext } from '@/hooks/assistants/useAssistantContext'

const root = createRoot(rootElement())

const Content = () => {
  const { assistant } = useAssistantContext()
  const isFilesEnabled = true
  console.log({ assistant })

  return (
    <Thread.MessageForm.Field.Root>
      {isFilesEnabled && (
        <>
          <Thread.MessageForm.Field.Files.Preview />
          <Thread.MessageForm.Field.Files.Control />
        </>
      )}
      <Thread.MessageForm.Field.Control />
      <Thread.MessageForm.Submit />
    </Thread.MessageForm.Field.Root>
  )
}

root.render(
  <Providers>
    <ThreadDialog.Root>
      <ThreadDialog.Content.Root>
        <Thread.Root>
          <ThreadDialog.Content.Messages />
          <ThreadDialog.Content.FormContainer>
            <Thread.MessageForm.Root>
              <Content />
            </Thread.MessageForm.Root>
          </ThreadDialog.Content.FormContainer>
        </Thread.Root>
      </ThreadDialog.Content.Root>
      <ThreadDialog.Trigger />
    </ThreadDialog.Root>
  </Providers>
)
