import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { loadContent } from './locations/content-loader'
import './styles/global.css'

async function start() {
  // On a location page, load that locality's article before the first render so the
  // prerendered content is replaced by identical content instead of a blank flash.
  const m = window.location.pathname.match(/^\/locations\/([^/]+)\/?$/)
  if (m) await loadContent(m[1]).catch(() => null)
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void start()
