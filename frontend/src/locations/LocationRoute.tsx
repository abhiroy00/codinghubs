import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { getCachedContent, loadContent } from './content-loader'
import { LocationView } from './LocationView'
import { getLocation, locationPath } from './registry'
import { locationJsonLd } from './seo'
import { LOGO_URL, pageSeo } from '../seo/site'
import { useSeo } from '../seo/useSeo'
import type { LocationContent } from './types'
import { FS_CSS } from '../lib/fs-css'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'

export function LocationRoute() {
  useScopedStylesheet([
    FS_CSS,
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
    window.scrollTo(0, 0)
  }, [meta, content])

  const seo = useMemo(() => meta && content?.slug === meta.slug ? pageSeo({
    path: locationPath(meta.slug), title: content.metaTitle, description: content.metaDescription,
    image: LOGO_URL, indexable: true, jsonLd: locationJsonLd(meta, content),
  }) : null, [meta, content])
  useSeo(seo)

  if (!meta) return <Navigate to="/locations/" replace />
  if (!content || content.slug !== meta.slug) return <div className="fs-page" aria-busy="true" style={{ minHeight: '100vh' }} />
  return <LocationView meta={meta} content={content} />
}
