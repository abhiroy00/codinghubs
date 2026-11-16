import { FsFooter } from '../locations/FsShell'
import '../pages/free-session/home-theme.css'

/** Shared brand footer for public page shells. */
export function SiteFooter() {
  return (
    <div className="ch-home site-footer-scope">
      <FsFooter />
    </div>
  )
}
