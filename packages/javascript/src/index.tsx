import { createRoot } from 'react-dom/client'
import { rootElement } from '@/lib/rootElement'
import { App } from '@/components/App'

console.log('Initing Superinterface...')

const root = createRoot(rootElement())
root.render(<App />)
