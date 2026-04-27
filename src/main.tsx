import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from '@/app/App'
import '@/index.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

// basename z import.meta.env.BASE_URL — Vite wstrzykuje '/' lokalnie i
// '/kid-learn/' na GitHub Pages. Trim trailing '/' bo BrowserRouter tego wymaga.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
