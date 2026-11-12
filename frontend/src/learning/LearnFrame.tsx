import { useMemo, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageFrame, useSeo } from '../content-pages/shared'
import { COURSE_BY_SLUG } from './catalog'
import { learningMeta } from '../seo/learning'
import { LOGO_URL } from '../seo/site'
import { SITE_URL } from '../locations/registry'
import type { Seo } from '../content-pages/api'
import './learning.css'
import './prep-shell.css'

export type Crumb = { label: string; to?: string }

function pageMeta(path: string, title: string, description: string): Seo {
  const canonical = SITE_URL + path
  return {
    title, description, canonical, robots: 'index, follow, max-image-preview:large',
    og: { type: 'website', title, description, image: LOGO_URL, url: canonical, alt: 'Coding Hubs School of AI' },
    json_ld: null,
  }
}

/**
 * The public shell used by courses and interview prep (site header, breadcrumb, footer, site tokens).
 * Other learning-adjacent pages pass a `trail` so they sit inside exactly the same chrome.
 */
export function LearnFrame({
  children,
  trail,
  title,
  description,
}: {
  children: ReactNode
  trail?: Crumb[]
  title?: string
  description?: string
}) {
  const { pathname } = useLocation()
  const parts = pathname.split('/').filter(Boolean)
  const learning = parts[0] === 'courses' || parts[0] === 'interview-prep'
  const kind = parts[0] === 'interview-prep' ? 'interview-prep' : 'courses'
  const slug = parts[1]
  const seo = useMemo(
    () => (learning ? learningMeta(kind, slug) : title && description ? pageMeta(pathname, title, description) : null),
    [learning, kind, slug, pathname, title, description],
  )
  useSeo(seo)
  const course = learning && slug ? COURSE_BY_SLUG.get(slug) : undefined
  const crumbs: Crumb[] =
    trail ??
    (learning
      ? [{ label: kind === 'courses' ? 'Courses' : 'Interview Prep', to: `/${kind}/` }, ...(course ? [{ label: course.name }] : [])]
      : [])
  return (
    <PageFrame wide>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        {crumbs.map((crumb, index) => {
          const current = index === crumbs.length - 1
          return (
            <span key={`${crumb.label}-${index}`}>
              <span aria-hidden="true"> / </span>
              {crumb.to && !current ? (
                <Link to={crumb.to}>{crumb.label}</Link>
              ) : (
                <span aria-current={current ? 'page' : undefined}>{crumb.label}</span>
              )}
            </span>
          )
        })}
      </nav>
      {children}
    </PageFrame>
  )
}
