import { createRoot } from 'react-dom/client'
import {
  Thread,
} from '@superinterface/react'
import { rootElement } from '@/lib/rootElement'
import { Providers } from '@/components/Providers'

const root = createRoot(rootElement())

root.render(
  <Providers>
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
  </Providers>
)
