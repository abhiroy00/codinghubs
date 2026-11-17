/**
 * Loads the code of another section (blog, projects, guides, courses, interview prep, programs, locations) as soon as
 * the visitor shows intent to open it: pointer over, touch or keyboard focus on a link to it. The click then finds the
 * chunk ready, so navigation still feels instant.
 *
 * It used to fetch every section after page load. That downloaded ~150 KB of JS on every visit (mostly for pages the
 * visitor never opens) and, because loading a chunk also attaches its stylesheets, added those sections' CSS to the
 * current page. Skipped on slow or data-saving connections.
 */
const ROUTES: [RegExp, () => Promise<unknown>][] = [
  [/^\/interview\/?$/, () => Promise.all([import('../interview/InterviewHub'),import('../learning/LearnFrame')])],
  [/^\/interview\/guides\//, () => import('../interview/InterviewGuide')],
  [/^\/newsletter(?:\/|$)/, () => import('../community/Newsletter')],
  [/^\/brochures(?:\/|$)/, () => import('../community/Brochures')],
  [/^\/blog\/?$/, () => import('./../content-pages/BlogList')],
  [/^\/(blog|case-studies)\/[^/]+/, () => import('./../content-pages/Article')],
  [/^\/case-studies\/?$/, () => import('./../content-pages/CaseList')],
  [/^\/projects(\/|$)/, () => import('./../shop-pages/projects')],
  [/^\/project-guides(\/|$)/, () => import('./../shop-pages/guides')],
  [/^\/(courses|interview)(\/|$)/, () => Promise.all([import('./../learning/CourseLearning'), import('./../learning/LearnFrame')])],
  [/^\/program\//, () => import('./../pages/Curriculum')],
  [/^\/locations\/?$/, () => import('./../locations/LocationsIndex')],
]

export function prefetchRoutesWhenIdle() {
  if (typeof window === 'undefined') return
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (conn?.saveData || (conn?.effectiveType && /(^|-)2g$/.test(conn.effectiveType))) return
  const started = new Set<number>()
  const onIntent = (event: Event) => {
    const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
    if (!link || link.origin !== location.origin || link.pathname === location.pathname) return
    const index = ROUTES.findIndex(([re]) => re.test(link.pathname))
    if (index < 0 || started.has(index)) return
    started.add(index)
    void ROUTES[index][1]().catch(() => started.delete(index))
  }
  const opts = { passive: true, capture: true }
  document.addEventListener('pointerover', onIntent, opts)
  document.addEventListener('touchstart', onIntent, opts)
  document.addEventListener('focusin', onIntent, opts)
}
