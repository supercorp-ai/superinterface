import { createRoot } from 'react-dom/client'
import { Thread } from '@superinterface/react'
import { Providers } from '@/components/Providers'

const element = document.createElement('div')
element.classList.add('superinterface')
document.querySelector('#thread-root')?.appendChild(element)

const root = createRoot(element)

root.render(
  <Providers>
    <Thread />
  </Providers>,
)
