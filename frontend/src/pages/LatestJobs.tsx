import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { FS_CSS } from '../lib/fs-css'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import { FsFooter, FsHeader } from '../locations/FsShell'
import './book-tutor.css'
import './jobs.css'

interface Job {
  id: number
  slug: string
  title: string
  company_name: string
  company_logo: string
  company_about: string
  location: string
  work_mode: string
  work_mode_label: string
  job_type: string
  job_type_label: string
  experience_level: string
  experience_level_label: string
  experience: string
  salary: string
  description: string
  responsibilities: string[]
  skills: string[]
  qualifications: string[]
  benefits: string[]
  how_to_apply: string
  application_url: string
  application_email: string
  application_deadline: string | null
  published_at: string | null
  is_open: boolean
}

type Filters = { q: string; company: string; location: string; mode: string; type: string; level: string; sort: 'latest' | 'oldest' }
const NO_FILTERS: Filters = { q: '', company: '', location: '', mode: '', type: '', level: '', sort: 'latest' }

const formatDate = (value: string) => new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

/** Unique [value, label] pairs for a select, in first-seen order. */
function options(jobs: Job[], value: (job: Job) => string, label: (job: Job) => string = value) {
  const seen = new Map<string, string>()
  for (const job of jobs) if (!seen.has(value(job))) seen.set(value(job), label(job))
  return [...seen].sort((a, b) => a[1].localeCompare(b[1]))
}

/** Where Apply Now goes: the external link if there is one, otherwise an email to the employer. */
function applyTarget(job: Job) {
  if (job.application_url) return { href: job.application_url, external: true }
  if (job.application_email) return { href: `mailto:${job.application_email}?subject=${encodeURIComponent(`Application: ${job.title} (${job.company_name})`)}`, external: false }
  return null
}

function ApplyButton({ job, className = '' }: { job: Job; className?: string }) {
  const target = applyTarget(job)
  if (!job.is_open || !target) return <button type="button" className={`btn btn-ghost ${className}`} disabled>Applications closed</button>
  return target.external
    ? <a className={`btn btn-yellow ${className}`} href={target.href} target="_blank" rel="noopener noreferrer">Apply Now</a>
    : <a className={`btn btn-yellow ${className}`} href={target.href}>Apply Now</a>
}

function CompanyLogo({ job, large = false }: { job: Job; large?: boolean }) {
  const [failed, setFailed] = useState(false)
  const className = `job-logo${large ? ' large' : ''}`
  return job.company_logo && !failed
    ? <img className={className} src={job.company_logo} alt={`${job.company_name} logo`} loading="lazy" onError={() => setFailed(true)} />
    : <div className={`${className} job-logo-placeholder`} aria-hidden="true">{job.company_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div>
}

export function LatestJobs() {
  useScopedStylesheet([
    FS_CSS,
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap',
  ])
  const { slug } = useParams()

  return (
    <div className="fs-page tutors-page jobs-page">
      <FsHeader />
      <main id="main">{slug ? <JobDetail slug={slug} /> : <JobListing />}</main>
      <FsFooter />
    </div>
  )
}

function JobListing() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    document.title = 'Latest Jobs | Coding Hubs School of AI'
    api.get<Job[]>('/jobs/')
      .then(({ data }) => setJobs(data))
      .catch(() => setLoadError('Job openings could not be loaded. Please try again later.'))
      .finally(() => setLoading(false))
  }, [])

  const companies = useMemo(() => options(jobs, (job) => job.company_name), [jobs])
  const locations = useMemo(() => options(jobs, (job) => job.location), [jobs])
  const modes = useMemo(() => options(jobs, (job) => job.work_mode, (job) => job.work_mode_label), [jobs])
  const types = useMemo(() => options(jobs, (job) => job.job_type, (job) => job.job_type_label), [jobs])
  const levels = useMemo(() => options(jobs, (job) => job.experience_level, (job) => job.experience_level_label), [jobs])

  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    const matches = jobs.filter((job) =>
      (!q || [job.title, job.company_name, job.description, ...job.skills].some((text) => text.toLowerCase().includes(q))) &&
      (!filters.company || job.company_name === filters.company) &&
      (!filters.location || job.location === filters.location) &&
      (!filters.mode || job.work_mode === filters.mode) &&
      (!filters.type || job.job_type === filters.type) &&
      (!filters.level || job.experience_level === filters.level))
    // The API returns newest first.
    return filters.sort === 'oldest' ? [...matches].reverse() : matches
  }, [jobs, filters])

  const activeCount = [filters.company, filters.location, filters.mode, filters.type, filters.level].filter(Boolean).length
  const set = (field: keyof Filters) => (event: { target: { value: string } }) => setFilters((current) => ({ ...current, [field]: event.target.value }))
  const select = (field: keyof Filters, label: string, items: [string, string][]) => (
    <label className="jobs-control">
      <span>{label}</span>
      <select value={filters[field]} onChange={set(field)}>
        <option value="">All</option>
        {items.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>
  )

  return (
    <>
      <section className="tutors-hero">
        <div className="container-x tutors-hero-inner">
          <p className="eyebrow">CAREER OPPORTUNITIES</p>
          <h1 className="display-lg">Latest <span>Jobs</span></h1>
          <p className="lede">Explore the latest job opportunities and take the next step in your career.</p>
          <a className="btn btn-yellow btn-lg" href="#job-list">
            Browse openings
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </a>
        </div>
      </section>

      <section className="section tutors-section" id="job-list" aria-labelledby="jobs-heading">
        <div className="container-x">
          <div className="tutors-section-heading">
            <div>
              <p className="eyebrow">OPEN POSITIONS</p>
              <h2 className="display-md" id="jobs-heading">Find a role that fits your skills</h2>
            </div>
            <p className="muted">New openings are added regularly. Apply directly with the employer.</p>
          </div>

          <form className="jobs-filters" role="search" aria-label="Filter jobs" onSubmit={(event) => event.preventDefault()}>
            <label className="jobs-control jobs-search">
              <span>Search</span>
              <input type="search" value={filters.q} onChange={set('q')} placeholder="Job title, company or skill" />
            </label>
            <button type="button" className="btn btn-ghost jobs-filter-toggle" aria-expanded={filtersOpen} aria-controls="jobs-filter-more" onClick={() => setFiltersOpen((open) => !open)}>
              Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
            <div id="jobs-filter-more" className={`jobs-filter-more${filtersOpen ? ' open' : ''}`}>
              {select('company', 'Company', companies)}
              {select('location', 'Location', locations)}
              {select('mode', 'Work mode', modes)}
              {select('type', 'Job type', types)}
              {select('level', 'Experience', levels)}
              <label className="jobs-control">
                <span>Sort by</span>
                <select value={filters.sort} onChange={set('sort')}>
                  <option value="latest">Latest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </label>
            </div>
          </form>
          {!loading && !loadError && jobs.length > 0 && (
            <div className="jobs-result-bar">
              <p role="status">{visible.length} {visible.length === 1 ? 'job' : 'jobs'} found</p>
              <button type="button" className="jobs-clear" onClick={() => setFilters(NO_FILTERS)} disabled={JSON.stringify(filters) === JSON.stringify(NO_FILTERS)}>Clear filters</button>
            </div>
          )}

          {loading && <p className="tutors-state" role="status">Loading job openings…</p>}
          {loadError && <p className="tutors-state tutors-error" role="alert">{loadError}</p>}
          {!loading && !loadError && jobs.length === 0 && (
            <div className="tutors-empty">
              <h3>No openings right now</h3>
              <p>New jobs are posted regularly. Please check back soon.</p>
            </div>
          )}
          {jobs.length > 0 && visible.length === 0 && (
            <div className="tutors-empty">
              <h3>No jobs match your filters</h3>
              <p>Try a different keyword or clear the filters to see all openings.</p>
              <button type="button" className="btn btn-yellow" onClick={() => setFilters(NO_FILTERS)}>Clear filters</button>
            </div>
          )}
          {visible.length > 0 && (
            <div className="job-grid">
              {visible.map((job) => (
                <article className="job-card" key={job.id}>
                  <div className="job-card-head">
                    <CompanyLogo job={job} />
                    <div>
                      <p className="tutor-designation">{job.company_name}</p>
                      <h3><Link to={`/latest-jobs/${job.slug}/`}>{job.title}</Link></h3>
                    </div>
                  </div>
                  <ul className="job-meta">
                    <li>{job.location}</li>
                    <li>{job.work_mode_label}</li>
                    <li>{job.job_type_label}</li>
                    <li>{job.experience || job.experience_level_label}</li>
                  </ul>
                  {job.salary && <p className="job-salary">{job.salary}</p>}
                  {job.published_at && <p className="job-posted">Posted {formatDate(job.published_at)}</p>}
                  <div className="tutor-actions">
                    <Link className="btn btn-ghost" to={`/latest-jobs/${job.slug}/`}>View Details</Link>
                    <ApplyButton job={job} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function JobDetail({ slug }: { slug: string }) {
  const [job, setJob] = useState<Job | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')

  useEffect(() => {
    let active = true
    setState('loading')
    window.scrollTo(0, 0)
    api.get<Job>(`/jobs/${slug}/`)
      .then(({ data }) => { if (active) { setJob(data); setState('ready'); document.title = `${data.title} at ${data.company_name} | Latest Jobs | Coding Hubs School of AI` } })
      .catch((error) => active && setState((error as { response?: { status?: number } }).response?.status === 404 ? 'missing' : 'error'))
    return () => { active = false; document.title = 'Coding Hubs School of AI' }
  }, [slug])

  const list = (title: string, items: string[]) => items.length > 0 && <section><h2>{title}</h2><ul className="job-list">{items.map((item) => <li key={item}>{item}</li>)}</ul></section>

  return (
    <section className="section tutor-profile-page">
      <div className="container-x">
        {state === 'loading' && <p className="tutors-state" role="status">Loading job details…</p>}
        {state === 'error' && <p className="tutors-state tutors-error" role="alert">This job could not be loaded. Please try again later.</p>}
        {state === 'missing' && (
          <div className="tutors-empty">
            <h1>Job not found</h1>
            <p>This opening may have been removed.</p>
            <Link className="btn btn-yellow" to="/latest-jobs/#job-list">Back to all jobs</Link>
          </div>
        )}
        {state === 'ready' && job && (
          <article className="tutor-detail">
            <Link className="tutor-back-link" to="/latest-jobs/#job-list">← All jobs</Link>
            <div className="tutor-profile-header">
              <CompanyLogo job={job} large />
              <div>
                <p className="tutor-profile-eyebrow">{job.is_open ? 'NOW HIRING' : 'APPLICATIONS CLOSED'}</p>
                <p className="tutor-designation">{job.company_name}</p>
                <h1>{job.title}</h1>
              </div>
            </div>
            {!job.is_open && <p className="job-expired" role="status">This job has expired and is no longer accepting applications.</p>}
            <dl className="job-facts">
              <div><dt>Location</dt><dd>{job.location}</dd></div>
              <div><dt>Work mode</dt><dd>{job.work_mode_label}</dd></div>
              <div><dt>Job type</dt><dd>{job.job_type_label}</dd></div>
              <div><dt>Experience</dt><dd>{job.experience || job.experience_level_label}</dd></div>
              {job.salary && <div><dt>Salary / stipend</dt><dd>{job.salary}</dd></div>}
              {job.application_deadline && <div><dt>Apply by</dt><dd>{formatDate(job.application_deadline)}</dd></div>}
              {job.published_at && <div><dt>Posted</dt><dd>{formatDate(job.published_at)}</dd></div>}
            </dl>
            <div className="tutor-profile-details">
              <section className="tutor-detail-about"><h2>Job description</h2><p className="job-text">{job.description}</p></section>
              {list('Responsibilities', job.responsibilities)}
              {job.skills.length > 0 && <section><h2>Required skills</h2><ul className="tutor-profile-tags">{job.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul></section>}
              {list('Qualifications', job.qualifications)}
              {list('Benefits', job.benefits)}
              {job.company_about && <section><h2>About {job.company_name}</h2><p className="job-text">{job.company_about}</p></section>}
              <section className="tutor-detail-about">
                <h2>How to apply</h2>
                {job.how_to_apply && <p className="job-text">{job.how_to_apply}</p>}
                <p>
                  {job.application_url && <>Apply on the employer’s website using the Apply Now button.</>}
                  {job.application_url && job.application_email && ' '}
                  {job.application_email && <>{job.application_url ? 'You can also email' : 'Email'} your application to <a href={`mailto:${job.application_email}`}>{job.application_email}</a>.</>}
                </p>
              </section>
            </div>
            <div className="tutor-booking-cta">
              <div><strong>{job.is_open ? `Interested in this role at ${job.company_name}?` : 'This opening has closed'}</strong><p>{job.is_open ? 'Apply directly with the employer.' : 'Browse the latest openings for other opportunities.'}</p></div>
              {job.is_open ? <ApplyButton job={job} className="tutor-detail-book" /> : <Link className="btn btn-yellow tutor-detail-book" to="/latest-jobs/#job-list">See open jobs</Link>}
            </div>
          </article>
        )}
      </div>
    </section>
  )
}
