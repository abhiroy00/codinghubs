import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { api } from '../lib/api'
import type { Course } from '../lib/types'
import { COURSE_CATALOG, COURSE_CATEGORIES, COURSE_BY_SLUG, type CourseDefinition } from './catalog'
import './learning.css'
import './learning-extra.css'

type Saved = { done: number[]; scores: Record<number, number>; challenge: number[]; questions: number[]; projects: string[]; currentDay?: number; lastLearningDate?: string | null; updated: string }
type BankQuestion = { id: number; course_slug: string; course_name: string; level: 'basic' | 'intermediate' | 'advanced'; topic: string; question: string; answer: string; explanation: string; coding_prompt: string; coding_solution: string; example: string }
const LEVELS: BankQuestion['level'][] = ['basic', 'intermediate', 'advanced']
const empty: Saved = { done: [], scores: {}, challenge: [], questions: [], projects: [], currentDay: 1, lastLearningDate: null, updated: '' }
const key = (slug: string) => `ch_learning_${slug}`
function readProgress(slug: string): Saved {
  try { const saved = JSON.parse(localStorage.getItem(key(slug)) || '{}'); return { ...empty, ...saved, questions: saved.questions ?? saved.completed_questions ?? [], projects: saved.projects ?? saved.completed_projects ?? [] } } catch { return empty }
}
function writeProgress(slug: string, progress: Saved) {
  progress.updated = new Date().toISOString()
  localStorage.setItem(key(slug), JSON.stringify(progress))
}

function CourseCard({ course }: { course: CourseDefinition }) {
  return <article className="learn-course-card"><span>{course.category}</span><h2>{course.name}</h2><p>{course.summary}</p><div className="learn-card-actions"><Link className="learn-button" to={`/courses/${course.slug}/`}>Course details</Link><Link className="learn-button learn-button-quiet" to={`/interview-prep/${course.slug}/`}>30-day prep</Link></div></article>
}

function EnrollmentLink({ slug }: { slug: string }) {
  const [available, setAvailable] = useState(false)
  useEffect(() => { let active = true; api.get<Course>(`/courses/${slug}/`).then(() => active && setAvailable(true)).catch(() => active && setAvailable(false)); return () => { active = false } }, [slug])
  return available ? <Link className="learn-button learn-button-quiet" to={`/enroll/${slug}/`}>Enrollment options</Link> : null
}

function ProjectCompletion({ slug, project }: { slug: string; project: string }) {
  const { user } = useAuth()
  const [done, setDone] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  useEffect(() => { setDone(readProgress(slug).projects.includes(project)) }, [slug, project])
  useEffect(() => {
    if (!user) return
    api.get(`/courses/learning/progress/${slug}/`).then(({ data }) => setDone((data.completed_projects || []).includes(project))).catch(() => undefined)
  }, [slug, project, user])
  async function markProject() {
    if (!confirmed || done) return
    const saved = readProgress(slug)
    const projects = [...new Set([...saved.projects, project])]
    const next = { ...saved, projects, updated: new Date().toISOString() }
    writeProgress(slug, next)
    setDone(true)
    if (user) await api.put(`/courses/learning/progress/${slug}/`, { completed_projects: projects }).catch(() => undefined)
  }
  return <div className="project-completion"><label><input type="checkbox" checked={confirmed || done} disabled={done} onChange={(event) => setConfirmed(event.target.checked)}/> I completed the deliverable and reviewed the listed outcome.</label><button className="learn-button learn-button-quiet" disabled={!confirmed || done} onClick={markProject}>{done ? 'Project completed' : 'Mark project complete'}</button></div>
}

export function CourseDirectory() {
  return <main className="learn-shell"><header className="learn-hero"><p className="learn-kicker">LEARN WITH A PLAN</p><h1>Courses & interview preparation</h1><p>Explore the existing course catalog, review the learning path and practise one day at a time.</p></header><div className="learn-directory"><nav className="learn-directory-nav"><a href="#courses">Courses</a><a href="#prep">Interview prep</a></nav><section id="courses"><h2>Explore courses</h2>{COURSE_CATEGORIES.map((category) => <div className="learn-category" key={category.name}><h3>{category.name}</h3><div className="learn-course-grid">{category.courses.map((course) => <CourseCard key={course.slug} course={course}/>)}</div></div>)}</section><section id="prep" className="learn-prep-intro"><h2>30-day interview prep</h2><p>Choose a course to open its roadmap. Daily lessons include focused theory, interview practice, a five-question knowledge check and a practical challenge.</p><div className="learn-course-grid">{COURSE_CATALOG.slice(0, 6).map((course) => <CourseCard key={course.slug} course={course}/>)}</div></section></div></main>
}

function LearningDashboard() {
  const [saved, setSaved] = useState<Record<string, Saved>>({})
  const { user } = useAuth()
  useEffect(() => {
    const next: Record<string, Saved> = {}
    COURSE_CATALOG.forEach((course) => { const value = readProgress(course.slug); if (value.done.length || value.challenge.length || value.questions.length || value.projects.length) next[course.slug] = value })
    setSaved(next)
  }, [])
  useEffect(() => {
    if (!user) return
    api.get('/courses/learning/progress/').then(({ data }) => {
      const next: Record<string, Saved> = {}
      for (const row of data) {
        const local = readProgress(row.course_slug)
        next[row.course_slug] = { done: [...new Set([...local.done, ...(row.completed_days || [])])], challenge: [...new Set([...local.challenge, ...(row.completed_challenges || [])])], questions: [...new Set([...local.questions, ...(row.completed_questions || [])])], projects: [...new Set([...local.projects, ...(row.completed_projects || [])])], scores: { ...local.scores, ...(row.quiz_scores || {}) }, currentDay: row.current_day, lastLearningDate: row.last_learning_date, updated: local.updated }
        writeProgress(row.course_slug, next[row.course_slug])
      }
      setSaved((current) => ({ ...current, ...next }))
    }).catch(() => undefined)
  }, [user])
  const [selectedSlug, setSelectedSlug] = useState('')
  const selected = COURSE_BY_SLUG.get(selectedSlug)
  const active = COURSE_CATALOG.filter((course) => saved[course.slug])
  return <main className="learn-shell"><header className="learn-hero"><p className="learn-kicker">YOUR LEARNING SPACE</p><h1>Interview prep dashboard</h1><p>Choose a course roadmap or continue your saved preparation.</p></header><div className="learn-directory"><section className="learn-section"><h2>Start interview preparation</h2><label className="course-picker-label" htmlFor="prep-course">Select a course</label><select id="prep-course" className="course-picker" value={selectedSlug} onChange={(event) => setSelectedSlug(event.target.value)}><option value="">Choose a course</option>{COURSE_CATEGORIES.map((category) => <optgroup key={category.name} label={category.name}>{category.courses.map((course) => <option key={course.slug} value={course.slug}>{course.name}</option>)}</optgroup>)}</select>{selected && <p className="learn-card-actions"><Link className="learn-button" to={`/interview-prep/${selected.slug}/`}>Open {selected.name} roadmap</Link><Link className="learn-button learn-button-quiet" to={`/courses/${selected.slug}/`}>Course details</Link></p>}</section><section className="learn-prep-intro"><h2>My progress</h2>{active.length ? <div className="learn-course-grid">{active.map((course) => { const data = saved[course.slug]; const average = Object.values(data.scores).length ? Math.round(Object.values(data.scores).reduce((a, b) => a + b, 0) / Object.values(data.scores).length) : 0; return <article className="learn-course-card" key={course.slug}><span>{course.category}</span><h2>{course.name}</h2><p>Current day {data.currentDay || 1} · {data.done.length}/30 complete · {Math.round(data.done.length / 30 * 100)}%</p><p>Quiz average {average}/5 · {data.questions.length} questions · {data.challenge.length} challenges · {data.projects.length} projects</p><p>Last learning date: {data.lastLearningDate || 'Not started'}</p><div className="learn-card-actions"><Link className="learn-button" to={`/interview-prep/${course.slug}/`}>Continue roadmap</Link><Link className="learn-button learn-button-quiet" to={`/certificates/${course.slug}/`}>{data.done.length === 30 ? 'View certificate' : `Certificate locked · ${data.done.length}/30 days`}</Link></div></article>})}</div> : <p className="learn-muted">No saved course progress yet. Start a roadmap above to track your learning.</p>}</section></div></main>
}

export function CourseDetails() {
  const { slug = '' } = useParams()
  const course = COURSE_BY_SLUG.get(slug)
  if (!course) return <main className="learn-shell"><h1>Course not found</h1><Link to="/courses/">Browse all courses</Link></main>
  return <main className="learn-shell learn-detail"><header className="learn-hero"><p className="learn-kicker">{course.category.toUpperCase()} · 30 DAY LEARNING PATH</p><h1>{course.name}</h1><p>{course.introduction}</p><div className="learn-hero-actions"><Link className="learn-button" to={`/interview-prep/${course.slug}/`}>Start interview prep</Link><EnrollmentLink slug={course.slug}/><Link className="learn-button learn-button-quiet" to="/#register">Book a demo</Link><Link className="learn-button learn-button-quiet" to="/courses/">Browse courses</Link></div></header>
    <div className="learn-content"><section className="learn-section"><h2>Course overview</h2><p>{course.summary}</p><p>This self-guided roadmap provides a practical structure for building and reviewing skills. Confirm schedule, fees and prerequisites with the school before enrolling.</p></section>
      <section className="learn-section"><h2>What you will learn</h2><div className="learn-pills">{course.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></section>
      <section className="learn-section"><h2>Tools and concepts</h2><div className="learn-pills">{course.tools.map((tool) => <span key={tool}>{tool}</span>)}</div></section>
      <section className="learn-section"><h2>Curriculum</h2><div className="learn-modules">{course.modules.map((module, i) => <details key={module.title} open={i === 0}><summary><span>Module {i + 1}</span>{module.title}</summary><p>{module.description}</p><ul>{module.topics.map((topic) => <li key={topic}>{topic}</li>)}</ul></details>)}</div></section>
      <section className="learn-section"><h2>Practical projects</h2><div className="learn-project-grid">{course.projects.map((project) => <article key={project.name}><h3>{project.name}</h3><p>{project.description}</p><h4>Objectives</h4><ul>{project.objectives.map((item) => <li key={item}>{item}</li>)}</ul><h4>Suggested steps</h4><ol>{project.steps.map((item) => <li key={item}>{item}</li>)}</ol><p><b>Outcome:</b> {project.outcome}</p><ProjectCompletion slug={course.slug} project={project.name}/></article>)}</div></section>
      <section className="learn-section"><h2>Career directions</h2><div className="learn-pills">{course.careers.map((career) => <span key={career}>{career}</span>)}</div></section>
      <section className="learn-section"><h2>Frequently asked questions</h2>{course.faqs.map((faq) => <details className="learn-faq" key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</section>
      <aside className="learn-cta"><div><h2>Prepare for your next interview</h2><p>Follow the course-specific 30-day roadmap and track your progress in this browser.</p></div><Link className="learn-button" to={`/interview-prep/${course.slug}/`}>Open 30-day plan</Link></aside>
    </div>
  </main>
}

function dailyQuestions(course: CourseDefinition, day: number) {
  const topic = course.days[day - 1]?.title || course.focus
  return [
    { q: `What problem does ${topic} help solve in ${course.focus}?`, options: ['It provides a structured way to address a defined need', 'It removes the need to understand requirements', 'It guarantees every result is correct', 'It replaces validation'], answer: 0, why: `Start by connecting ${topic} to the requirement; then validate the result against evidence.` },
    { q: `Before applying ${topic}, what should you establish first?`, options: ['A measurable goal and relevant constraints', 'A final presentation theme', 'The largest possible scope', 'A tool before understanding the task'], answer: 0, why: 'Clear goals and constraints make the workflow testable and appropriately scoped.' },
    { q: `Which is the strongest way to check work involving ${topic}?`, options: ['Use relevant examples and edge cases with explicit criteria', 'Assume the first result is correct', 'Only review visual appearance', 'Skip documentation'], answer: 0, why: 'Representative checks and edge cases provide evidence beyond a happy-path result.' },
    { q: `A limitation appears while using ${topic}. What is the best response?`, options: ['Record the limitation, assess impact and adapt the approach', 'Hide it from reviewers', 'Ignore it if the demo works', 'Expand scope without review'], answer: 0, why: 'Transparent limitations support sound decisions and responsible iteration.' },
    { q: `How should you explain a decision about ${topic} in an interview?`, options: ['Describe context, options, decision, evidence and trade-offs', 'List tools without explaining the outcome', 'Claim certainty without evidence', 'Avoid mentioning alternatives'], answer: 0, why: 'A concise decision narrative makes your reasoning and evidence clear.' },
  ]
}

function dailyChallenge(course: CourseDefinition, day: number) {
  const topic = course.days[day - 1]?.title || course.focus
  return course.hasCoding
    ? { title: `Practise: ${topic}`, task: `Create a small, reviewable ${course.focus} exercise that demonstrates ${topic}. State the input, expected result and at least one edge case.`, solution: `Suggested solution: define the requirement and constraints, implement the smallest useful workflow with ${course.tools.slice(0, 2).join(' and ')}, validate expected and edge-case behavior, then document trade-offs.`, tests: ['A representative valid input produces the stated result.', 'An invalid or boundary case is handled explicitly.', 'The result can be explained and reproduced.'] }
    : { title: `Apply: ${topic}`, task: `Create a short practical artifact for ${course.focus} that demonstrates ${topic}. Include the audience, objective, evidence and one improvement after review.`, solution: 'Suggested solution: define the audience and success criterion, make a focused first version, review it against the criterion, document feedback and make one evidence-based improvement.', tests: ['The artifact addresses the stated audience and goal.', 'The success criterion can be checked.', 'Feedback and the resulting improvement are documented.'] }
}

const TRACK_LESSONS: Record<CourseDefinition['track'], string> = {
  ai: 'Identify the user goal and trusted context first. Separate instructions from source material, validate any structured output, and measure answer quality with representative cases before relying on a model response.',
  development: 'Write down the API or feature contract, then implement a small testable boundary. Validate input on the server, enforce user ownership, handle failures explicitly and cover both normal and edge cases.',
  data: 'State the question and row grain before calculating a metric. Check missingness, joins and time boundaries, then validate results against a simple baseline and communicate uncertainty.',
  cloud: 'Start from availability, identity, network and recovery requirements. Choose the smallest suitable service, restrict permissions, observe failure signals and test recovery rather than assuming configuration is correct.',
  security: 'Identify the asset, trust boundary and likely impact. Gather evidence, prioritize by exposure and business risk, apply a control and verify that it changes the relevant threat path.',
  program: 'Define a measurable outcome and acceptance criteria. Break the work into reviewable steps, surface dependencies early and keep decisions, risks and evidence visible to collaborators.',
  design: 'Begin with the user task and evidence, then make the information hierarchy and interaction states explicit. Test keyboard access, responsive behavior and comprehension with representative users.',
  marketing: 'Tie the audience and offer to a measurable action. Define attribution and quality guardrails before launch, then review channel and cohort evidence before changing spend or creative.',
}

export function InterviewPrep() {
  const { slug } = useParams()
  const [day, setDay] = useState(1)
  const [progress, setProgress] = useState<Saved>(empty)
  const [answers, setAnswers] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const [draft, setDraft] = useState('')
  const [bank, setBank] = useState<BankQuestion[]>([])
  const [bankLoading, setBankLoading] = useState(false)
  const [level, setLevel] = useState<BankQuestion['level']>('basic')
  const [challengeChecks, setChallengeChecks] = useState<boolean[]>([])
  const { user } = useAuth()
  const course = slug ? COURSE_BY_SLUG.get(slug) : null
  useEffect(() => { if (slug) { const saved = readProgress(slug); setProgress(saved); setDay(Math.max(1, Math.min(30, saved.currentDay || (saved.done.length ? Math.max(...saved.done) + 1 : 1)))) } }, [slug])
  useEffect(() => {
    if (!slug || !user) return
    let active = true
    api.get(`/courses/learning/progress/${slug}/`).then(({ data }) => {
      if (!active) return
      const local = readProgress(slug)
      const hasLocalProgress = local.done.length > 0 || local.challenge.length > 0 || Boolean(local.updated)
      const merged: Saved = { done: [...new Set([...local.done, ...(data.completed_days || [])])], challenge: [...new Set([...local.challenge, ...(data.completed_challenges || [])])], questions: [...new Set([...local.questions, ...(data.completed_questions || [])])], projects: [...new Set([...local.projects, ...(data.completed_projects || [])])], scores: { ...local.scores, ...(data.quiz_scores || {}) }, currentDay: hasLocalProgress ? local.currentDay : data.current_day, lastLearningDate: data.last_learning_date || local.lastLearningDate, updated: local.updated }
      setProgress(merged); setDay(merged.currentDay || 1); writeProgress(slug, merged)
      api.put(`/courses/learning/progress/${slug}/`, { current_day: merged.currentDay, completed_days: merged.done, quiz_scores: merged.scores, completed_challenges: merged.challenge, completed_questions: merged.questions, completed_projects: merged.projects }).catch(() => undefined)
    }).catch(() => undefined)
    return () => { active = false }
  }, [slug, user])
  useEffect(() => {
    if (!slug) return
    let active = true
    setBankLoading(true)
    api.get<BankQuestion[]>(`/courses/questions/${slug}/`).then(({ data }) => active && setBank(data)).catch(() => active && setBank([])).finally(() => active && setBankLoading(false))
    return () => { active = false }
  }, [slug])
  const questions = useMemo(() => course ? dailyQuestions(course, day) : [], [course, day])
  useEffect(() => { if (slug) setDraft(localStorage.getItem(`${key(slug)}_draft_${day}`) || '') }, [slug, day])
  useEffect(() => { setChallengeChecks([]) }, [slug, day])
  if (!course) return <LearningDashboard />
  const lesson = course.days[day - 1]
  const challenge = dailyChallenge(course, day)
  const score = questions.reduce((sum, question, i) => sum + (answers[i] === question.answer ? 1 : 0), 0)
  const persist = (next: Saved) => { const currentDay = next.currentDay ?? day; const value = { ...next, currentDay, lastLearningDate: new Date().toISOString().slice(0, 10) }; setProgress(value); writeProgress(course.slug, value); if (user) api.put(`/courses/learning/progress/${course.slug}/`, { current_day: currentDay, completed_days: value.done, quiz_scores: value.scores, completed_challenges: value.challenge, completed_questions: value.questions, completed_projects: value.projects }).catch(() => undefined) }
  const moveDay = (nextDay: number) => { setDay(nextDay); persist({ ...progress, currentDay: nextDay }); setAnswers([]); setSubmitted(false); setShowSolution(false) }
  const finishDay = () => persist({ ...progress, done: [...new Set([...progress.done, day])], scores: { ...progress.scores, [day]: score } })
  const markChallenge = () => { if (challengeChecks.length === challenge.tests.length && challengeChecks.every(Boolean) && (!course.hasCoding || draft.trim().length >= 80)) persist({ ...progress, challenge: [...new Set([...progress.challenge, day])] }) }
  const markQuestion = (questionId: number) => persist({ ...progress, questions: progress.questions.includes(questionId) ? progress.questions.filter((id) => id !== questionId) : [...progress.questions, questionId] })
  const currentBank = bank.filter((question) => question.level === level)
  return <main className="learn-shell learn-prep"><header className="learn-hero"><p className="learn-kicker">30-DAY INTERVIEW PREPARATION</p><h1>{course.name}</h1><p>Daily learning, interview questions, knowledge checks and practical work for {course.focus}.</p><div className="learn-progress"><span>{progress.done.length} of 30 days completed</span><div><i style={{ width: `${(progress.done.length / 30) * 100}%` }}/></div></div></header>
      <div className="prep-layout"><aside className="prep-day-list"><h2>Roadmap</h2>{course.days.map((item, i) => <button className={`${day === i + 1 ? 'active' : ''} ${progress.done.includes(i + 1) ? 'complete' : ''}`} key={item.title} onClick={() => moveDay(i + 1)}><span>Day {i + 1}</span><small>{item.title.replace(` for ${course.focus}`, '')}</small>{progress.done.includes(i + 1) && <b>✓</b>}</button>)}</aside>
      <div className="prep-main"><section className="learn-section"><div className="prep-heading"><p className="learn-kicker">DAY {day} · {lesson.module}</p><h2>{lesson.title}</h2></div><h3>Today’s learning</h3><p>{TRACK_LESSONS[course.track]}</p><div className="prep-callout"><b>Daily summary</b><p>Today you practised {lesson.title} for {course.name}. Explain the core decision, cite the evidence you used, and note one limitation or improvement for your next iteration.</p></div><h3>Interview practice</h3>{[1,2,3].map((n) => <details className="prep-question" key={n}><summary>{n}. How would you apply {lesson.title} in a real {course.focus} project?</summary><p>Start with the requirement and constraints. Describe a small, testable approach; explain why it fits; name evidence and edge cases; then compare one alternative and its trade-off.</p></details>)}</section>
        <section className="learn-section"><h2>Interview questions</h2><p>Select a level to practise the automatically loaded question bank for {course.name}. Answers include explanations and coding examples where relevant.</p><div className="learn-level-tabs" role="tablist" aria-label="Question difficulty">{LEVELS.map((item) => <button type="button" role="tab" aria-selected={level === item} className={level === item ? 'active' : ''} key={item} onClick={() => setLevel(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div>{bankLoading ? <p>Loading questions…</p> : currentBank.length ? <div className="prep-bank-list">{currentBank.map((item) => <article className="prep-bank-card" key={item.id}><div className="prep-bank-meta"><b>{item.course_name}</b><span>{item.level}</span><span>{item.topic}</span></div><h3>{item.question}</h3><details><summary>Show answer and explanation</summary><h4>Answer</h4><p>{item.answer}</p><h4>Explanation</h4><p>{item.explanation}</p>{item.example && <p><b>Example:</b> {item.example}</p>}{item.coding_prompt && <><h4>Coding question</h4><p>{item.coding_prompt}</p><h4>Example solution</h4><pre className="prep-code-solution"><code>{item.coding_solution}</code></pre></>}</details><button type="button" className="learn-button learn-button-quiet" onClick={() => markQuestion(item.id)}>{progress.questions.includes(item.id) ? 'Practised ✓' : 'Mark as practised'}</button></article>)}</div> : <p className="learn-muted">Question bank content is being prepared for this course. Please try again shortly.</p>}</section>
        <section className="learn-section"><h2>Knowledge check</h2><p>Choose an answer for each question, then submit to see explanations and your score.</p>{questions.map((q, i) => <fieldset className="prep-quiz-question" key={q.q}><legend>{i + 1}. {q.q}</legend>{q.options.map((option, n) => <label key={option} className={submitted ? (n === q.answer ? 'correct' : answers[i] === n ? 'incorrect' : '') : ''}><input type="radio" name={`q-${i}`} checked={answers[i] === n} onChange={() => { const next = [...answers]; next[i] = n; setAnswers(next) }} disabled={submitted}/>{option}</label>)}{submitted && <p className="quiz-explanation">{q.why}</p>}</fieldset>)}<div className="learn-card-actions"><button className="learn-button" onClick={() => setSubmitted(true)} disabled={answers.length !== questions.length || answers.includes(undefined as unknown as number)}>Submit answers</button>{submitted && <button className="learn-button learn-button-quiet" onClick={finishDay}>Save score: {score}/5</button>}</div>{submitted && <p className="quiz-result">Score: {score} / 5. Review the explanations and revisit any missed concepts.</p>}</section>
        <section className="learn-section"><h2>{challenge.title}</h2><p>{challenge.task}</p>{course.hasCoding && <><div className="prep-callout"><b>Manual practice</b><p>Use this editor to draft your solution. Code is saved in this browser and is not executed. Complete all review checks below before marking the challenge done.</p></div><label className="prep-editor-label" htmlFor="challenge-draft">Your practice draft</label><textarea id="challenge-draft" className="prep-editor" rows={10} spellCheck={false} value={draft} onChange={(e) => { setDraft(e.target.value); localStorage.setItem(`${key(course.slug)}_draft_${day}`, e.target.value) }}/></>}{!course.hasCoding && <div className="prep-callout"><b>Practical exercise</b><p>Create the artifact in your preferred tool, then confirm each review check below.</p></div>}<h3>Acceptance checks</h3><div className="challenge-checklist">{challenge.tests.map((item, index) => <label key={item}><input type="checkbox" checked={challengeChecks[index] ?? false} onChange={(event) => setChallengeChecks((current) => { const next = [...current]; next[index] = event.target.checked; return next })}/>{item}</label>)}</div><button className="learn-button learn-button-quiet" onClick={() => setShowSolution(!showSolution)}>{showSolution ? 'Hide solution guidance' : 'Show solution guidance'}</button>{showSolution && <div className="prep-callout"><b>Suggested solution approach</b><p>{challenge.solution}</p></div>}<div className="challenge-complete"><button className="learn-button" disabled={progress.challenge.includes(day) || challengeChecks.length !== challenge.tests.length || !challengeChecks.every(Boolean) || (course.hasCoding && draft.trim().length < 80)} onClick={markChallenge}>{progress.challenge.includes(day) ? 'Challenge completed' : 'Mark challenge complete'}</button>{course.hasCoding && draft.trim().length < 80 && <small>Add and review your solution draft before completion.</small>}</div></section>
        <div className="prep-navigation"><button className="learn-button learn-button-quiet" disabled={day === 1} onClick={() => moveDay(day - 1)}>Previous day</button><button className="learn-button" disabled={day === 30} onClick={() => moveDay(day + 1)}>Next day</button></div>
      </div></div>
  </main>
}
