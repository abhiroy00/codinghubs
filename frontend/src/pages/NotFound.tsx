import { Link } from 'react-router-dom'
import { FS_CSS } from '../lib/fs-css'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import { FsFooter, FsHeader } from '../locations/FsShell'
import { GONE_META, NOT_FOUND_META, pageSeo } from '../seo/site'
import { useSeo } from '../seo/useSeo'

const NOT_FOUND_SEO = pageSeo(NOT_FOUND_META)
const GONE_SEO = pageSeo(GONE_META)

/**
 * Shown for unknown routes. The server also answers 404 for these URLs (see nginx.conf); this covers client-side
 * navigation. With `gone`, it is the 410 page for permanently removed URLs (the retired store).
 */
export function NotFound({ gone = false }: { gone?: boolean }) {
  useSeo(gone ? GONE_SEO : NOT_FOUND_SEO)
  useScopedStylesheet([FS_CSS])
  return (
    <div className="fs-page">
      <FsHeader />
      <main id="main" className="nf">
        <div className="wrap">
          <p className="eyebrow">{gone ? 'Error 410' : 'Error 404'}</p>
          <h1>{gone ? 'This page has been removed' : 'We could not find that page'}</h1>
          <p>
            {gone
              ? 'Our online store has closed, so this page is gone for good. Our courses are still open:'
              : 'The link may be old or mistyped. Try one of these instead:'}
          </p>
          <div className="cta-row">
            <Link to={gone ? '/courses/' : '/'} className="btn btn-yellow btn-lg">
              {gone ? 'Explore courses' : 'Go to the home page'}
            </Link>
            <Link to={gone ? '/' : '/locations/'} className="btn btn-navy btn-lg">
              {gone ? 'Go to the home page' : 'Browse AI course locations'}
            </Link>
          </div>
        </div>
      </main>
      <FsFooter />
    </div>
  )
}
