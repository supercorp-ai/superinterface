import { createRoot } from 'react-dom/client'
import { rootElement } from '@/lib/rootElement'
import { App } from '@/components/App'

const root = createRoot(rootElement())

root.render(<App />)
