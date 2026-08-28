import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { App } from '@/app/App'
import '@/index.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

// basename z import.meta.env.BASE_URL — Vite wstrzykuje '/' lokalnie i
// '/kid-learn/' na GitHub Pages. Trim trailing '/' bo BrowserRouter tego wymaga.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

// Nowa wersja z GitHub Pages: SW pobiera ją w tle, ale przeładowanie strony
// robimy dopiero na Home. Reload w środku sesji gubił odpowiedzi dziecka
// i ucinał audio w połowie zdania.
const HOME_CHECK_INTERVAL_MS = 10_000

function isOnHome(): boolean {
  const base = basename === '/' ? '' : basename
  const path = window.location.pathname.replace(/\/$/, '')
  return path === base
}

let updateTimer: number | null = null

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (isOnHome()) {
      if (updateTimer !== null) {
        window.clearInterval(updateTimer)
        updateTimer = null
      }
      void updateSW()
      return
    }
    // React Router nawiguje przez pushState (bez `popstate`), więc powrót na
    // Home wykrywamy pollingiem — tanio i niezależnie od routera.
    // onNeedRefresh może odpalić się więcej niż raz (np. kolejny deploy), więc
    // czyścimy poprzedni interval zanim założymy nowy — inaczej wyciek.
    if (updateTimer !== null) {
      window.clearInterval(updateTimer)
    }
    updateTimer = window.setInterval(() => {
      if (!isOnHome()) return
      if (updateTimer !== null) {
        window.clearInterval(updateTimer)
        updateTimer = null
      }
      void updateSW()
    }, HOME_CHECK_INTERVAL_MS)
  },
})

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
