import { createRoot } from 'react-dom/client'
import { rootElement } from '@/lib/rootElement'
import { App } from '@/components/App'

// const d = document
// const e = d.createElement("link")
// e.rel = "stylesheet";
// e.type = "text/css";
// e.href = "http://localhost:3000/styles.css";
// e.media = "all";
// d.getElementsByTagName("head")[0].appendChild(e);

console.log('Initing Superinterface...')

const root = createRoot(rootElement())
root.render(<App />)
