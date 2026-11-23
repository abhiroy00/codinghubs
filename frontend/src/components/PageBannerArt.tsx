import type { HeroClip } from './HeroVideo'
import './page-banner.css'

/**
 * Inner-page heroes use the light "insights" look (same as the blog): no artwork, a soft blue gradient and navy text.
 * This marker switches the host hero to that theme (see the .hv-light rules in page-banner.css). Home keeps its video hero.
 */
export function PageBannerArt(_props: { clip: HeroClip }) {
  return <span className="hv-light" aria-hidden="true" />
}
