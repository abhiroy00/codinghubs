import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { getCachedContent, loadContent } from './content-loader'
import { LocationView } from './LocationView'
import { getLocation } from './registry'
import type { LocationContent } from './types'
import { FS_CSS } from '../lib/fs-css'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'

export function LocationRoute() {
  useScopedStylesheet([
    FS_CSS,
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700;800&display=swap',
  ])
  const { slug } = useParams<{ slug: string }>()
  const meta = getLocation(slug)
  const [content, setContent] = useState<LocationContent | null>(() => (slug ? (getCachedContent(slug) ?? null) : null))

  useEffect(() => {
    if (!slug) return
    let live = true
    loadContent(slug).then((c) => {
      if (live) setContent(c)
    })
    return () => {
      live = false
    }
  }, [slug])

  useEffect(() => {
    if (!meta || !content) return
    document.title = content.metaTitle
    window.scrollTo(0, 0)
  }, [meta, content])

  if (!meta) return <Navigate to="/locations/" replace />
  if (!content || content.slug !== meta.slug) return <div className="fs-page" aria-busy="true" style={{ minHeight: '100vh' }} />
  return <LocationView meta={meta} content={content} />
}
