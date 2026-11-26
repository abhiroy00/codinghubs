import { useMemo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { PageFrame, useSeo } from '../content-pages/shared'
import { COURSE_BY_SLUG } from './catalog'
import { learningMeta } from '../seo/learning'
import { LOGO_URL } from '../seo/site'
import { SITE_URL } from '../locations/registry'
import type { Seo } from '../content-pages/api'
import { getRobotsDirective } from '../seo/robots'
import './learning.css'
import './prep-shell.css'
import '../pages/free-session/home-theme.css'

function pageMeta(path: string, title: string, description: string): Seo {
  const canonical = SITE_URL + path
  return {
    // Editorial landing pages (visual lab, studio overview) are complete by review.
    title, description, canonical, robots: getRobotsDirective({ kind: 'content', status: 'COMPLETE' }),
    og: { type: 'website', title, description, image: LOGO_URL, url: canonical, alt: 'Coding Hubs School of AI' },
    json_ld: null,
  }
}

/**
 * The public shell used by courses and interview prep (site header, footer, site tokens).
 */
export function LearnFrame({
  children,
  title,
  description,
  metadata,
}: {
  children: ReactNode
  title?: string
  description?: string
  metadata?: Seo
}) {
  const { pathname } = useLocation()
  const parts = pathname.split('/').filter(Boolean)
  const learning = parts[0] === 'courses' || parts[0] === 'interview'
  const kind = parts[0] === 'interview' ? 'interview' : 'courses'
  const slug = parts[1]
  const seo = useMemo(
    // Courses added in the admin panel are not in the catalogue: their page sets its own metadata (CustomCourseDetails).
    () => metadata ?? (kind === 'courses' && slug && !COURSE_BY_SLUG.has(slug) ? null
      : learning ? learningMeta(kind, slug) : title && description ? pageMeta(pathname, title, description) : null),
    [metadata, learning, kind, slug, pathname, title, description],
  )
  useSeo(seo)
  return (
    <div className="ch-home">
      <PageFrame wide>
        {children}
      </PageFrame>
    </div>
  )
}
