import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FS_CSS } from '../lib/fs-css'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import { FsFooter, FsHeader } from '../locations/FsShell'

/** Shown for unknown routes. The server also answers 404 for these URLs (see nginx.conf); this covers client-side navigation. */
export function NotFound() {
  useScopedStylesheet([FS_CSS, 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap'])
  useEffect(() => {
    document.title = 'Page not found | Coding Hubs School of AI'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => {
      document.head.removeChild(meta)
    }
  }, [])
  return (
    <div className="fs-page">
      <FsHeader />
      <main id="main" className="nf">
        <div className="wrap">
          <p className="eyebrow">Error 404</p>
          <h1>We could not find that page</h1>
          <p>The link may be old or mistyped. Try one of these instead:</p>
          <div className="cta-row">
            <Link to="/" className="btn btn-yellow btn-lg">
              Go to the home page
            </Link>
            <Link to="/locations/" className="btn btn-navy btn-lg">
              Browse AI course locations
            </Link>
          </div>
        </div>
      </main>
      <FsFooter />
    </div>
  )
}
