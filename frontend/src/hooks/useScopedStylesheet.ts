import { useEffect } from 'react'

/** Loads stylesheet(s)/fonts only while the calling component is mounted, then removes them. */
export function useScopedStylesheet(hrefs: string[]) {
  useEffect(() => {
    const links = hrefs.map((href) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      document.head.appendChild(link)
      return link
    })
    return () => {
      links.forEach((link) => document.head.removeChild(link))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
