import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { FS_CSS } from '../lib/fs-css'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import { FsFooter, FsHeader } from '../locations/FsShell'
import './book-tutor.css'
import './jobs.css'
import '../pages/free-session/home-theme.css'
import type { Seo } from '../content-pages/api'
import { useSeo } from '../seo/useSeo'
import { JOBS_SEO, MISSING_SEO, directoryInitial, recordSeo } from '../seo/directory'
import { HeroVideo } from '../components/HeroVideo'

interface Job {
  seo?: Seo
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
  /** "manual" for jobs posted by Coding Hub; otherwise the API or careers page it was imported from. */
  source?: string
  source_label?: string
  is_imported?: boolean
}

const enc = encodeURIComponent
/** Live searches on job sites that do not offer a public jobs API: always their newest listings, opened on their site. */
const EXTERNAL_SEARCHES = [
  {
    site: 'Naukri', note: 'Latest jobs in Delhi NCR',
    links: [
      ['Python developer', 'https://www.naukri.com/python-developer-jobs-in-delhi-ncr'],
      ['Data analyst', 'https://www.naukri.com/data-analyst-jobs-in-delhi-ncr'],
      ['AI / ML engineer', 'https://www.naukri.com/machine-learning-engineer-jobs-in-delhi-ncr'],
      ['Internships', 'https://www.naukri.com/internship-jobs-in-delhi-ncr'],
    ],
  },
  {
    site: 'LinkedIn', note: 'Posted in the last 24 hours, newest first',
    links: [
      ['Python developer', `https://www.linkedin.com/jobs/search/?keywords=${enc('Python Developer')}&location=${enc('Delhi, India')}&f_TPR=r86400&sortBy=DD`],
      ['Data analyst', `https://www.linkedin.com/jobs/search/?keywords=${enc('Data Analyst')}&location=${enc('Delhi, India')}&f_TPR=r86400&sortBy=DD`],
      ['AI / ML engineer', `https://www.linkedin.com/jobs/search/?keywords=${enc('Machine Learning Engineer')}&location=India&f_TPR=r86400&sortBy=DD`],
      ['Internships', `https://www.linkedin.com/jobs/search/?keywords=${enc('Software Intern')}&location=India&f_E=1&f_TPR=r86400&sortBy=DD`],
    ],
  },
  {
    site: 'Internshala', note: 'Internships in Delhi',
    links: [
      ['Python', 'https://internshala.com/internships/python-django-internship-in-delhi/'],
      ['Data science', 'https://internshala.com/internships/data-science-internship-in-delhi/'],
      ['Machine learning', 'https://internshala.com/internships/machine-learning-internship-in-delhi/'],
      ['Web development', 'https://internshala.com/internships/web-development-internship-in-delhi/'],
    ],
  },
] as const

function ExternalJobSearch() {
  return (
    <section className="jobs-external" aria-labelledby="jobs-external-title">
      <h2 id="jobs-external-title">More jobs &amp; internships, updated live</h2>
      <p>Open the newest listings on India’s biggest job sites. Each link opens a live search on that site.</p>
      <div className="jobs-external-grid">
        {EXTERNAL_SEARCHES.map((group) => (
          <div className="jobs-external-card" key={group.site}>
            <h3>{group.site}</h3>
            <p>{group.note}</p>
            <ul>
              {group.links.map(([label, href]) => (
                <li key={label}><a href={href} target="_blank" rel="noopener noreferrer">{label}<span className="sr-only"> on {group.site} (opens in a new tab)</span> <span aria-hidden="true">↗</span></a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

const formatDate = (value: string) => new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

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
  ])
  const { slug } = useParams()

  return (
    <div className="fs-page tutors-page jobs-page ch-home">
      <FsHeader />
      <main id="main">{slug ? <JobDetail slug={slug} /> : <JobListing />}</main>
      <FsFooter />
    </div>
  )
}

function JobListing() {
  useSeo(JOBS_SEO)
  return (
    <>
      <section className="tutors-hero hv-host"><HeroVideo clip="latest-jobs" />
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

      <section className="section tutors-section" id="job-list" aria-labelledby="jobs-external-title">
        <div className="container-x">
          <ExternalJobSearch />
        </div>
      </section>
    </>
  )
}

function JobDetail({ slug }: { slug: string }) {
  const initial = useMemo(() => { const data = directoryInitial<{ item: Job }>('job'); return data?.item.slug === slug ? data.item : null }, [slug])
  const [job, setJob] = useState<Job | null>(initial)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>(initial ? 'ready' : 'loading')
  const seo = useMemo(() => state === 'ready' && job ? job.seo ?? recordSeo(`/latest-jobs/${job.slug}/`, `${job.title} at ${job.company_name} | Coding Hubs School of AI`, job.description, job.is_open) : MISSING_SEO, [job, state])
  useSeo(seo)

  useEffect(() => {
    let active = true
    setState(initial ? 'ready' : 'loading')
    window.scrollTo(0, 0)
    api.get<Job>(`/jobs/${slug}/`)
      .then(({ data }) => { if (active) { setJob(data); setState('ready') } })
      .catch((error) => active && setState((error as { response?: { status?: number } }).response?.status === 404 ? 'missing' : 'error'))
    return () => { active = false }
  }, [slug, initial])

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
                {job.is_imported && job.source_label && <p className="job-source-note">This listing comes from {job.source_label === 'Company careers page' ? `${job.company_name}’s careers page` : job.source_label}. Details can change, so check the original listing before you apply.</p>}
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
