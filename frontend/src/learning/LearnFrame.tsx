import { useMemo, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageFrame, useSeo } from '../content-pages/shared'
import { COURSE_BY_SLUG } from './catalog'
import { learningMeta } from '../seo/learning'

/** One source for browser metadata and server-rendered learning metadata. */
export function LearnFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const parts = pathname.split('/').filter(Boolean)
  const kind = parts[0] === 'interview-prep' ? 'interview-prep' : 'courses'
  const slug = parts[1]
  const seo = useMemo(() => learningMeta(kind, slug), [kind, slug])
  useSeo(seo)
  const course = slug ? COURSE_BY_SLUG.get(slug) : undefined
  return <PageFrame wide><nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true"> / </span>{course ? <><Link to={'/' + kind + '/'}>{kind === 'courses' ? 'Courses' : 'Interview Prep'}</Link><span aria-hidden="true"> / </span><span aria-current="page">{course.name}</span></> : <span aria-current="page">{kind === 'courses' ? 'Courses' : 'Interview Prep'}</span>}</nav>{children}</PageFrame>
}
