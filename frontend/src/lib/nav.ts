/** Path of the page the visitor came from inside the site (set by ScrollManager). */
let prev = ''
let current = typeof window === 'undefined' ? '' : window.location.pathname
export function trackPath(pathname: string) {
  if (pathname !== current) {
    prev = current
    current = pathname
  }
}
export const previousPath = () => prev
