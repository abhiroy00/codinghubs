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
  // Blog / case-study pages are lazy chunks: load theirs first so the server-rendered page is replaced without a blank flash.
  const c = window.location.pathname.match(/^\/(blog|case-studies)(\/|$)/)
  if (c) await (c[1] === 'blog' ? import('./content-pages/BlogList') : import('./content-pages/CaseList')).catch(() => null)
  if (c && window.location.pathname.split('/').filter(Boolean).length > 1) await import('./content-pages/Article').catch(() => null)
  // Store / projects / guides pages are lazy chunks too: load theirs first so the server-rendered page is replaced without a flash.
  const sp = window.location.pathname.match(/^\/(store|projects|project-guides)(\/|$)/)
  if (sp) await import('./shop-pages/catalog').catch(() => null)
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void start()
