import { FsFooter } from '../locations/FsShell'
import '../pages/free-session/home-theme.css'

/**
 * The footer exactly as the Course pages show it: the shared FsFooter (CTA band + footer)
 * inside the `.ch-home` theme scope that gives it the dark navy styling.
 * Use this on any page that should carry the Course footer; never render it next to FsFooter.
 */
export function SiteFooter() {
  return (
    <div className="ch-home site-footer-scope">
      <FsFooter />
    </div>
  )
}
