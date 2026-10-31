import { useMemo, useState } from 'react'

export type BankQuestion = {
  id: number
  course_slug: string
  course_name: string
  level: 'basic' | 'intermediate' | 'advanced'
  topic: string
  question: string
  answer: string
  explanation: string
  coding_prompt: string
  coding_solution: string
  example: string
}

const LEVEL = {
  basic: { label: 'Easy', score: 10 },
  intermediate: { label: 'Medium', score: 20 },
  advanced: { label: 'Hard', score: 30 },
} as const
type Level = BankQuestion['level']
const LEVELS: Level[] = ['basic', 'intermediate', 'advanced']
const short = (t: string, n = 110) => (t.length > n ? `${t.slice(0, n).trim()}…` : t)
const draftKey = (slug: string, id: number) => `ch_practice_${slug}_${id}`

/** HackerRank-style practice list for a course: filters on the right, challenges in rows, and a solve view with an editor and the model answer. */
export function PracticeBoard({ slug, bank, loading, solved, onToggle }: { slug: string; bank: BankQuestion[]; loading: boolean; solved: number[]; onToggle: (id: number) => void }) {
  const [status, setStatus] = useState<'all' | 'solved' | 'unsolved'>('all')
  const [levels, setLevels] = useState<Level[]>([])
  const [topics, setTopics] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)

  const topicCounts = useMemo(() => {
    const m = new Map<string, number>()
    bank.forEach((b) => m.set(b.topic, (m.get(b.topic) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [bank])
  const isSolved = (id: number) => solved.includes(id)
  const score = bank.filter((b) => isSolved(b.id)).reduce((n, b) => n + LEVEL[b.level].score, 0)
  const total = bank.reduce((n, b) => n + LEVEL[b.level].score, 0)
  const rows = bank.filter((b) => {
    if (status === 'solved' && !isSolved(b.id)) return false
    if (status === 'unsolved' && isSolved(b.id)) return false
    if (levels.length && !levels.includes(b.level)) return false
    if (topics.length && !topics.includes(b.topic)) return false
    const t = q.trim().toLowerCase()
    return !t || `${b.question} ${b.topic}`.toLowerCase().includes(t)
  })
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const current = openId !== null ? bank.find((b) => b.id === openId) : null
  if (current) {
    const index = bank.findIndex((b) => b.id === current.id)
    return <SolveView key={current.id} slug={slug} item={current} solved={isSolved(current.id)} onToggle={() => onToggle(current.id)} onBack={() => setOpenId(null)} onPrev={index > 0 ? () => setOpenId(bank[index - 1].id) : undefined} onNext={index < bank.length - 1 ? () => setOpenId(bank[index + 1].id) : undefined} position={`${index + 1} of ${bank.length}`} />
  }

  return (
    <section className="pb" aria-labelledby="pb-title">
      <div className="pb-top">
        <div>
          <h2 id="pb-title">Practice challenges</h2>
          <p className="learn-muted">Solve interview questions and coding prompts for this course. Mark a challenge solved to earn its score.</p>
        </div>
        <div className="pb-score" aria-label="Your progress">
          <strong>{solved.filter((id) => bank.some((b) => b.id === id)).length}/{bank.length}</strong><span>solved</span>
          <strong>{score}/{total}</strong><span>points</span>
        </div>
      </div>

      {loading && <p className="bl-state" role="status">Loading challenges…</p>}
      {!loading && bank.length === 0 && <p className="learn-muted">Challenges for this course are being prepared. Please check again shortly.</p>}

      {bank.length > 0 && (
        <div className="pb-layout">
          <div className="pb-list">
            <label className="pb-search"><span className="sr-only">Search challenges</span><input type="search" placeholder="Search challenges" value={q} onChange={(e) => setQ(e.target.value)} /></label>
            {rows.length === 0 && <p className="learn-muted">No challenge matches these filters.</p>}
            <ul>
              {rows.map((b) => (
                <li key={b.id} className={`pb-row${isSolved(b.id) ? ' solved' : ''}`}>
                  <div className="pb-main">
                    <button type="button" className="pb-title" onClick={() => setOpenId(b.id)}>{short(b.question)}</button>
                    <p className="pb-sub"><span className={`pb-lvl ${b.level}`}>{LEVEL[b.level].label}</span> <span>Max score: {LEVEL[b.level].score}</span> <span>{b.topic}</span>{b.coding_prompt && <span>Coding</span>}</p>
                  </div>
                  <button type="button" className={`pb-solve${isSolved(b.id) ? ' done' : ''}`} onClick={() => setOpenId(b.id)}>{isSolved(b.id) ? 'Solved ✓' : 'Solve challenge'}</button>
                </li>
              ))}
            </ul>
          </div>

          <aside className="pb-filters" aria-label="Filters">
            <h3>Status</h3>
            {(['all', 'solved', 'unsolved'] as const).map((s) => (
              <label key={s}><input type="radio" name="pb-status" checked={status === s} onChange={() => setStatus(s)} /> {s[0].toUpperCase() + s.slice(1)}</label>
            ))}
            <h3>Difficulty</h3>
            {LEVELS.map((l) => (
              <label key={l}><input type="checkbox" checked={levels.includes(l)} onChange={() => setLevels(toggle(levels, l))} /> {LEVEL[l].label} <span>({bank.filter((b) => b.level === l).length})</span></label>
            ))}
            <h3>Topics</h3>
            {topicCounts.map(([t, n]) => (
              <label key={t}><input type="checkbox" checked={topics.includes(t)} onChange={() => setTopics(toggle(topics, t))} /> {t} <span>({n})</span></label>
            ))}
            {(status !== 'all' || levels.length > 0 || topics.length > 0 || q) && (
              <button type="button" className="pb-clear" onClick={() => { setStatus('all'); setLevels([]); setTopics([]); setQ('') }}>Clear filters</button>
            )}
          </aside>
        </div>
      )}
    </section>
  )
}

function SolveView({ slug, item, solved, onToggle, onBack, onPrev, onNext, position }: { slug: string; item: BankQuestion; solved: boolean; onToggle: () => void; onBack: () => void; onPrev?: () => void; onNext?: () => void; position: string }) {
  const [draft, setDraft] = useState(() => {
    try {
      return localStorage.getItem(draftKey(slug, item.id)) || ''
    } catch {
      return ''
    }
  })
  const [show, setShow] = useState(false)
  const save = (v: string) => {
    setDraft(v)
    try {
      localStorage.setItem(draftKey(slug, item.id), v)
    } catch {
      /* ignore */
    }
  }
  return (
    <section className="pb-solve-view" aria-labelledby="pbs-title">
      <div className="pbs-bar">
        <button type="button" className="pb-back" onClick={onBack}>← Back to challenges</button>
        <span className="learn-muted">{position}</span>
        <div className="pbs-nav">
          <button type="button" className="learn-button learn-button-quiet" disabled={!onPrev} onClick={onPrev}>Previous</button>
          <button type="button" className="learn-button learn-button-quiet" disabled={!onNext} onClick={onNext}>Next</button>
        </div>
      </div>
      <div className="pbs-grid">
        <article className="pbs-problem">
          <p className="pb-sub"><span className={`pb-lvl ${item.level}`}>{LEVEL[item.level].label}</span> <span>Max score: {LEVEL[item.level].score}</span> <span>{item.topic}</span></p>
          <h2 id="pbs-title">{item.question}</h2>
          {item.coding_prompt ? (<><h3>Problem statement</h3><p>{item.coding_prompt}</p></>) : (<p className="learn-muted">Write your answer in your own words in the editor, then compare it with the model answer.</p>)}
          {show && (
            <div className="pbs-answer">
              <h3>Model answer</h3>
              <p>{item.answer}</p>
              {item.explanation && (<><h3>Explanation</h3><p>{item.explanation}</p></>)}
              {item.example && <p><b>Example:</b> {item.example}</p>}
              {item.coding_solution && (<><h3>Example solution</h3><pre className="prep-code-solution"><code>{item.coding_solution}</code></pre></>)}
            </div>
          )}
        </article>
        <div className="pbs-editor">
          <label htmlFor="pbs-draft" className="prep-editor-label">Your answer</label>
          <textarea id="pbs-draft" className="prep-editor" rows={14} spellCheck={false} value={draft} onChange={(e) => save(e.target.value)} placeholder="Type your answer or code here. It is saved in this browser and is not executed." />
          <div className="pbs-actions">
            <button type="button" className="learn-button learn-button-quiet" onClick={() => setShow((s) => !s)}>{show ? 'Hide answer' : 'Show answer'}</button>
            <button type="button" className={`learn-button${solved ? ' learn-button-quiet' : ''}`} onClick={onToggle}>{solved ? 'Solved ✓ (undo)' : 'Mark as solved'}</button>
          </div>
        </div>
      </div>
    </section>
  )
}
