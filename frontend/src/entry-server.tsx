import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { LocationsIndex } from './locations/LocationsIndex'
import { LocationView } from './locations/LocationView'
import { INDEX_DESCRIPTION, INDEX_TITLE, indexJsonLd, locationJsonLd } from './locations/seo'
import { LOCATIONS, SITE_URL, locationPath } from './locations/registry'
import type { LocationContent } from './locations/types'

const contentModules = import.meta.glob<{ default: LocationContent }>('./locations/content/*.ts', { eager: true })

export interface PrerenderedPage {
  path: string
  title: string
  description: string
  canonical: string
  html: string
  jsonLd: unknown
}

export function renderAll(options: { skipMissing?: boolean } = {}): PrerenderedPage[] {
  const pages: PrerenderedPage[] = []

  pages.push({
    path: '/locations/',
    title: INDEX_TITLE,
    description: INDEX_DESCRIPTION,
    canonical: `${SITE_URL}/locations/`,
    html: renderToString(
      <StaticRouter location="/locations/">
        <LocationsIndex />
      </StaticRouter>,
    ),
    jsonLd: indexJsonLd(),
  })

  for (const meta of LOCATIONS) {
    const mod = contentModules[`./locations/content/${meta.slug}.ts`]
    if (!mod) {
      if (options.skipMissing) continue
      throw new Error(`Missing content module for ${meta.slug}`)
    }
    const content = mod.default
    pages.push({
      path: locationPath(meta.slug),
      title: content.metaTitle,
      description: content.metaDescription,
      canonical: `${SITE_URL}${locationPath(meta.slug)}`,
      html: renderToString(
        <StaticRouter location={locationPath(meta.slug)}>
          <LocationView meta={meta} content={content} />
        </StaticRouter>,
      ),
      jsonLd: locationJsonLd(meta, content),
    })
  }
  return pages
}
