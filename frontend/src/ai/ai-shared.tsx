import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { LearnFrame } from '../learning/LearnFrame'
import '../learning/learning.css'
import './ai.css'

/** A readable message for any failed API call: the server's own wording when it sent one. */
export function errorMessage(error: unknown): string {
  const e = error as AxiosError<Record<string, unknown>>
  if (!e.response) return 'Could not reach the server. Check your internet connection and try again.'
  const data = e.response.data
  if (data && typeof data.detail === 'string') return data.detail
  if (data && typeof data === 'object') {
    for (const value of Object.values(data)) {
      const first = Array.isArray(value) ? value[0] : value
      if (typeof first === 'string') return first
    }
  }
  return `Something went wrong (error ${e.response.status}). Please try again.`
}

export const AI_TOOLS = [
  { path: '/ai/answer-evaluation', title: 'Answer Evaluation', text: 'Write your answer to an interview question and get a score, what you missed and a model answer.' },
  { path: '/ai/mock-interview', title: 'AI Mock Interview', text: 'Practise a full interview. One question at a time, follow-ups, and a report at the end.' },
  { path: '/ai/resume-analyzer', title: 'Resume Analyzer', text: 'Upload your PDF resume for feedback, missing skills and questions an interviewer may ask.' },
  { path: '/ai/job-matcher', title: 'Job Matcher', text: 'Paste a job description and see how well your resume matches it, with a plan to close the gaps.' },
]

/** Page shell for every AI tool: site header and footer, a hero, and a login gate. */
export function AiPage({ kicker, title, intro, children }: { kicker: string; title: string; intro: string; children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <LearnFrame>
      <div className="learn-shell ai-shell">
        <header className="learn-hero">
          <p className="learn-kicker">{kicker}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
        </header>
        <nav className="ai-tabs" aria-label="AI tools">
          {AI_TOOLS.map((tool) => (
            <Link key={tool.path} to={tool.path} className={pathname.startsWith(tool.path) ? 'on' : ''}>{tool.title}</Link>
          ))}
        </nav>
        <RequireLogin>{children}</RequireLogin>
      </div>
    </LearnFrame>
  )
}

export function RequireLogin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Busy text="Loading…" />
  if (!user) {
    return (
      <section className="learn-section ai-empty">
        <h2>Log in to use the AI tools</h2>
        <p>Your answers, resumes and interview reports are saved to your account and are private to you.</p>
        <div className="learn-card-actions">
          <Link className="learn-button" to="/login" state={{ from: location }}>Log in</Link>
          <Link className="learn-button learn-button-quiet" to="/register">Create an account</Link>
        </div>
      </section>
    )
  }
  return <>{children}</>
}

export function Busy({ text }: { text: string }) {
  return <p className="ai-busy" role="status"><span className="ai-spinner" aria-hidden="true" />{text}</p>
}

export function ErrorBox({ message }: { message: string }) {
  return message ? <p className="ai-error" role="alert">{message}</p> : null
}

const tone = (ratio: number) => (ratio >= 0.7 ? 'good' : ratio >= 0.4 ? 'mid' : 'low')

/** A circular score. `value` is out of `max` (10 for scores, 100 for percentages). */
export function ScoreRing({ value, max = 10, label, unit = '' }: { value: number; max?: number; label: string; unit?: string }) {
  const ratio = Math.max(0, Math.min(1, value / max))
  const radius = 46
  const circumference = 2 * Math.PI * radius
  return (
    <figure className={`ai-ring ai-${tone(ratio)}`} aria-label={`${label}: ${value}${unit} out of ${max}${unit}`}>
      <svg viewBox="0 0 110 110" width="124" height="124" aria-hidden="true">
        <circle cx="55" cy="55" r={radius} className="ai-ring-track" />
        <circle cx="55" cy="55" r={radius} className="ai-ring-bar" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - ratio)} transform="rotate(-90 55 55)" />
        <text x="55" y="60" textAnchor="middle" className="ai-ring-text">{value}{unit}</text>
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  )
}

const DIMENSION_LABELS: Record<string, string> = {
  technical_accuracy: 'Technical accuracy', concept_clarity: 'Concept clarity', completeness: 'Completeness',
  practical_knowledge: 'Practical knowledge', relevance: 'Relevance', communication: 'Communication',
}

export function DimensionBars({ scores }: { scores: Record<string, number> }) {
  return (
    <ul className="ai-bars">
      {Object.keys(DIMENSION_LABELS).filter((key) => key in scores).map((key) => (
        <li key={key}>
          <span>{DIMENSION_LABELS[key]}</span>
          <div className="ai-bar" role="img" aria-label={`${DIMENSION_LABELS[key]} ${scores[key]} out of 10`}><i className={`ai-${tone(scores[key] / 10)}`} style={{ width: `${scores[key] * 10}%` }} /></div>
          <b>{scores[key]}</b>
        </li>
      ))}
    </ul>
  )
}

export function Points({ title, items, kind = '' }: { title: string; items?: string[]; kind?: 'good' | 'warn' | 'bad' | '' }) {
  if (!items || items.length === 0) return null
  return (
    <div className={`ai-points ${kind}`}>
      <h4>{title}</h4>
      <ul className="lesson-list">{items.map((item, i) => <li key={`${i}-${item.slice(0, 20)}`}>{item}</li>)}</ul>
    </div>
  )
}

export function Chips({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="ai-points">
      <h4>{title}</h4>
      <div className="ai-chips">{items.map((item, i) => <span key={`${i}-${item}`}>{item}</span>)}</div>
    </div>
  )
}

export function Callout({ title, children }: { title: string; children: ReactNode }) {
  return <div className="prep-callout"><b>{title}</b><p className="lesson-pre">{children}</p></div>
}

export function ConsentBox({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="ai-consent">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>I agree that my resume text (without my email, phone number and links) is sent to an AI service to be analysed. AI feedback can be wrong, so use it as a guide.</span>
    </label>
  )
}

export type ResumeSummary = { id: number; original_name: string; size: number; page_count: number; created_at: string; analyses: number; latest_analyzed_at: string | null }

/** The signed-in user's uploaded resumes. */
export function useResumes() {
  const [resumes, setResumes] = useState<ResumeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const reload = useCallback(async () => {
    try { setResumes((await api.get<ResumeSummary[]>('/ai/resume/history/')).data) } catch { /* the page shows its own errors when an action fails */ }
    setLoading(false)
  }, [])
  useEffect(() => { void reload() }, [reload])
  return { resumes, loading, reload }
}

export const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
