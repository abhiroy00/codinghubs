import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useRegisterPopup } from '../lib/register-popup'
import type { CourseDefinition } from './catalog'
import './course-programme.css'

type Brochure = {
  course_slug: string
  title: string
  description: string
  size: number
  download_url: string
  view_url: string
  cover_url: string
  cover_small_url: string
}
type Result = { status: 'loading' | 'missing' | 'error'; data?: never } | { status: 'ready'; data: Brochure }

/** Only the current published PDF is offered; an unpublished brochure never gets a substitute download. */
export function CourseBrochureSection({ course }: { course: Pick<CourseDefinition, 'slug' | 'name' | 'category'> }) {
  const popup = useRegisterPopup()
  const [result, setResult] = useState<Result>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    api.get<Brochure>(`/courses/brochures/${course.slug}/`, { signal: controller.signal, timeout: 8000 })
      .then(({ data }) => {
        if (!controller.signal.aborted) setResult({ status: 'ready', data })
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ status: error.response?.status === 404 ? 'missing' : 'error' })
      })
    return () => controller.abort()
  }, [course.slug, attempt])

  const brochure = result.data
  const size = brochure ? (brochure.size >= 1048576 ? `${(brochure.size / 1048576).toFixed(1)} MB` : `${Math.ceil(brochure.size / 1024)} KB`) : ''
  return (
    <section className="course-brochure" id="brochure" aria-labelledby="course-brochure-title">
      <div className="course-brochure-art" aria-hidden="true">
        {brochure?.cover_url ? (
          <img
            src={brochure.cover_url}
            srcSet={brochure.cover_small_url ? `${brochure.cover_small_url} 480w, ${brochure.cover_url} 960w` : undefined}
            sizes="(max-width: 640px) 100vw, 240px"
            alt="" width={960} height={540} loading="lazy" decoding="async"
          />
        ) : (
          <div className="course-brochure-paper">
            <span>Coding Hubs</span><small>School of AI</small>
            <strong>{course.name}</strong><i /><i /><i /><b>COURSE GUIDE / PDF</b>
          </div>
        )}
      </div>
      <div className="course-brochure-copy">
        <p className="course-eyebrow">Your next step, in detail</p>
        <h2 id="course-brochure-title">{course.name} brochure</h2>
        <p>{brochure?.description || 'Take a closer look at the Coding Hubs course. View the published brochure in your browser or save a copy to read later.'}</p>
        <p className="course-brochure-status" role="status" aria-live="polite">
          {result.status === 'loading' && 'Checking brochure availability…'}
          {result.status === 'ready' && `PDF · ${size} · Free to view and download`}
          {result.status === 'missing' && 'The PDF for this course has not been published yet. Ask our team for the latest details.'}
          {result.status === 'error' && 'We could not check the brochure right now. Please retry or ask our team.'}
        </p>
        <div className="course-brochure-actions">
          {brochure ? (
            <>
              <a className="course-action course-action-primary" href={brochure.download_url} download>Download brochure <span aria-hidden="true">↓</span></a>
              <a className="course-action course-action-secondary" href={brochure.view_url} target="_blank" rel="noopener noreferrer" aria-label={`View ${course.name} brochure (opens in a new tab)`}>View brochure <span aria-hidden="true">↗</span></a>
            </>
          ) : (
            <>
              <button type="button" className="course-action course-action-primary" disabled>Download brochure <span aria-hidden="true">↓</span></button>
              <button type="button" className="course-action course-action-secondary" disabled>View brochure <span aria-hidden="true">↗</span></button>
            </>
          )}
        </div>
        {result.status === 'error' && <button className="course-text-action" type="button" onClick={() => { setResult({ status: 'loading' }); setAttempt((value) => value + 1) }}>Retry brochure</button>}
        {(result.status === 'missing' || result.status === 'error') && <button className="course-text-action" type="button" onClick={() => popup.openEnrollment(course.name)}>Ask about this course →</button>}
      </div>
    </section>
  )
}
