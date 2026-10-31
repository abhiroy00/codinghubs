/**
 * Once the page has loaded and the browser is idle, fetch the code of the other sections (store, blog, projects, guides,
 * courses, interview prep, certificates, locations) so moving between them feels instant. Skipped on slow or data-saving connections.
 */
const LOADERS: (() => Promise<unknown>)[] = [
  () => import('./../shop-pages/store'),
  () => import('./../content-pages/BlogList'),
  () => import('./../content-pages/Article'),
  () => import('./../shop-pages/projects'),
  () => import('./../shop-pages/guides'),
  () => import('./../learning/CourseLearning'),
  () => import('./../learning/Certificates'),
  () => import('./../pages/Curriculum'),
  () => import('./../locations/LocationsIndex'),
]

export function prefetchRoutesWhenIdle() {
  if (typeof window === 'undefined') return
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (conn?.saveData || (conn?.effectiveType && /(^|-)2g$/.test(conn.effectiveType))) return
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
  const start = () => {
    let i = 0
    const next = () => {
      const load = LOADERS[i++]
      if (!load) return
      void load().catch(() => undefined).finally(() => setTimeout(next, 150))
    }
    next()
  }
  const schedule = () => (idle ? idle(start, { timeout: 4000 }) : setTimeout(start, 2500))
  if (document.readyState === 'complete') schedule()
  else window.addEventListener('load', schedule, { once: true })
}
