import { renderToString } from 'react-dom/server'
import { Route, Routes } from 'react-router-dom'
import { StaticRouter } from 'react-router-dom'
import { Curriculum } from './pages/Curriculum'
import { BookTutor } from './pages/BookTutor'
import { FreeSession } from './pages/FreeSession'
import { NotFound } from './pages/NotFound'
import { LocationsIndex } from './locations/LocationsIndex'
import { LocationView } from './locations/LocationView'
import { INDEX_DESCRIPTION, INDEX_TITLE, indexJsonLd, locationJsonLd } from './locations/seo'
import { LOCATIONS, SITE_URL, locationPath } from './locations/registry'
import type { LocationContent } from './locations/types'
import { FAQ_META, HOME_META, LOGO_URL, NOT_FOUND_META, POLICIES_META, PROGRAM_METAS, TUTOR_META } from './seo/site'

const contentModules = import.meta.glob<{ default: LocationContent }>('./locations/content/*.ts', { eager: true })

export interface PrerenderedPage {
  /** File written under dist/ */
  file: string
  /** Public URL path (also used for the canonical and the sitemap) */
  path: string
  title: string
  description: string
  image: string
  indexable: boolean
  /** true when the page uses the free-session design, so its stylesheet is linked statically in <head> */
  fsDesign: boolean
  html: string
  jsonLd?: unknown
}

export function renderAll(options: { skipMissing?: boolean } = {}): PrerenderedPage[] {
  const pages: PrerenderedPage[] = []

  pages.push({
    file: 'home.html',
    path: '/',
    title: HOME_META.title,
    description: HOME_META.description,
    image: HOME_META.image,
    indexable: true,
    fsDesign: true,
    html: renderToString(
      <StaticRouter location="/">
        <FreeSession />
      </StaticRouter>,
    ),
    jsonLd: HOME_META.jsonLd,
  })

  for (const meta of PROGRAM_METAS) {
    pages.push({
      file: `${meta.path.slice(1)}.html`,
      path: meta.path,
      title: meta.title,
      description: meta.description,
      image: meta.image,
      indexable: true,
      fsDesign: true,
      html: renderToString(
        <StaticRouter location={meta.path}>
          <Routes>
            <Route path="program/:slug" element={<Curriculum />} />
          </Routes>
        </StaticRouter>,
      ),
      jsonLd: meta.jsonLd,
    })
  }

  // Layout (global.css) pages: metadata only; the SPA renders their content in the browser.
  for (const meta of [FAQ_META, POLICIES_META]) {
    pages.push({ file: `${meta.path.slice(1)}.html`, path: meta.path, title: meta.title, description: meta.description, image: meta.image, indexable: meta.indexable, fsDesign: false, html: '' })
  }

  pages.push({
    file: 'book-a-tutor/index.html',
    path: TUTOR_META.path,
    title: TUTOR_META.title,
    description: TUTOR_META.description,
    image: TUTOR_META.image,
    indexable: TUTOR_META.indexable,
    fsDesign: true,
    html: renderToString(
      <StaticRouter location={TUTOR_META.path}>
        <BookTutor />
      </StaticRouter>,
    ),
    jsonLd: TUTOR_META.jsonLd,
  })

  pages.push({
    file: 'locations/index.html',
    path: '/locations/',
    title: INDEX_TITLE,
    description: INDEX_DESCRIPTION,
    image: LOGO_URL,
    indexable: true,
    fsDesign: true,
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
      file: `locations/${meta.slug}/index.html`,
      path: locationPath(meta.slug),
      title: content.metaTitle,
      description: content.metaDescription,
      image: `${SITE_URL}/assets/ai/loc/${meta.slug}.jpg`,
      indexable: true,
      fsDesign: true,
      html: renderToString(
        <StaticRouter location={locationPath(meta.slug)}>
          <LocationView meta={meta} content={content} />
        </StaticRouter>,
      ),
      jsonLd: locationJsonLd(meta, content),
    })
  }

  pages.push({
    file: '404.html',
    path: NOT_FOUND_META.path,
    title: NOT_FOUND_META.title,
    description: NOT_FOUND_META.description,
    image: NOT_FOUND_META.image,
    indexable: false,
    fsDesign: true,
    html: renderToString(
      <StaticRouter location="/404">
        <NotFound />
      </StaticRouter>,
    ),
  })

  return pages
}
