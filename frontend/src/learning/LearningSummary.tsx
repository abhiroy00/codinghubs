import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Summary { total_concepts: number; published_concepts: number; mastered_concepts: number; percent_mastered: number; certificate_eligible: boolean; certificate_blockers: string[]; modules: { slug: string; title: string; number: number; total_concepts: number; published_concepts: number; reading_and_quiz_complete: number; assignments_passed: number; mastered_concepts: number }[] }

export function LearningSummary({ refreshKey, course }: { refreshKey: string; course?: string }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let active = true
    api.get<Summary>(`/learning/summary/${course ? `?course=${encodeURIComponent(course)}` : ''}`).then(r => { if (active) { setSummary(r.data); setError('') } }).catch(() => { if (active) setError('Your learning summary could not be loaded.') })
    return () => { active = false }
  }, [refreshKey, tick, course])
  return <section className="rw-mastery"><h2>Your learning evidence</h2>{error && <p role="alert">{error}</p>}{summary ? <><p><strong>{summary.mastered_concepts} / {summary.total_concepts}</strong> concepts mastered ({summary.percent_mastered}%). {summary.published_concepts} concepts currently published.</p><progress max={Math.max(1, summary.total_concepts)} value={summary.mastered_concepts} /><p>Mastery combines all four learning parts, a passing quiz and a passing reviewed assignment for the current lesson version.</p><details><summary>Module progress</summary>{summary.modules.map(m => <div key={m.slug}><h3>{String(m.number).padStart(2, '0')}. {m.title}</h3><p>{m.published_concepts}/{m.total_concepts} published · {m.reading_and_quiz_complete} reading/quiz complete · {m.assignments_passed} assignments passed · {m.mastered_concepts} mastered</p></div>)}</details><p>Certificate eligibility: {summary.certificate_eligible ? 'Eligible' : 'Not eligible'}</p><ul>{summary.certificate_blockers.map(reason => <li key={reason}>{reason}</li>)}</ul></> : !error && <p role="status">Loading your learning evidence…</p>}<button type="button" onClick={() => setTick(v => v + 1)}>Refresh learning summary</button></section>
}
