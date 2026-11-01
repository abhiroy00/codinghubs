import { useEffect, useState, type ReactNode } from 'react'
import { runProgram } from './CodeEditor'

export type Code = { language: string; source: string }
export type CodingPractice = {
  kind: 'coding'; title: string; difficulty: string; objective: string; statement: string; language: string
  input_format: string; output_format: string; example: { input: string; output: string }; constraints: string[]
  starter: string; solution: string; explanation: string[]; tests: { input: string; output: string }[]
}
export type ExercisePractice = {
  kind: 'exercise'; title: string; difficulty: string; objective: string; statement: string
  deliverable: string; steps: string[]; checklist: string[]; sample_answer: string
}
export type QuizQuestion = { type: string; question: string; code?: string; options: string[]; answer: number; explanation: string }
export type Lesson = {
  day: number; title: string; module: string; level: string; objectives: string[]; definition: string
  theory: { heading: string; body: string; points?: string[] }[]
  example: { title: string; body: string; code?: Code }
  use_cases: { title: string; description: string }[]
  demonstration: { description: string; code?: Code; output?: string }
  takeaways: string[]
  interview: { question: string; answer: string; explanation: string }[]
  practice: CodingPractice | ExercisePractice
  quiz: QuizQuestion[]
}

export const PASS_SCORE = 3
const LANGUAGE_NAMES: Record<string, string> = { python: 'Python', javascript: 'JavaScript', java: 'Java', csharp: 'C#' }

function CodeBlock({ code, label }: { code: Code | string; label?: string }) {
  const source = typeof code === 'string' ? code : code.source
  const language = typeof code === 'string' ? '' : code.language
  return (
    <figure className="lesson-code">
      {(label || language) && <figcaption>{label ?? language}</figcaption>}
      <pre><code>{source}</code></pre>
    </figure>
  )
}

/** Definition, theory, example, use cases, demonstration and takeaways for one day. */
export function LessonBody({ lesson, read, onRead }: { lesson: Lesson; read: boolean; onRead: () => void }) {
  return (
    <>
      <h3>Learning objectives</h3>
      <ul className="lesson-list">{lesson.objectives.map((item) => <li key={item}>{item}</li>)}</ul>
      <div className="prep-callout"><b>Definition</b><p>{lesson.definition}</p></div>
      {lesson.theory.map((section) => (
        <div className="lesson-block" key={section.heading}>
          <h3>{section.heading}</h3>
          <p>{section.body}</p>
          {section.points && <ul className="lesson-list">{section.points.map((point) => <li key={point}>{point}</li>)}</ul>}
        </div>
      ))}
      <div className="lesson-block">
        <h3>Example: {lesson.example.title}</h3>
        <p>{lesson.example.body}</p>
        {lesson.example.code && <CodeBlock code={lesson.example.code} />}
      </div>
      <div className="lesson-block">
        <h3>Real-world use cases</h3>
        <div className="lesson-cases">{lesson.use_cases.map((item) => <div key={item.title}><b>{item.title}</b><p>{item.description}</p></div>)}</div>
      </div>
      <div className="lesson-block">
        <h3>Practical demonstration</h3>
        <p>{lesson.demonstration.description}</p>
        {lesson.demonstration.code && <CodeBlock code={lesson.demonstration.code} />}
        {lesson.demonstration.output && <CodeBlock code={lesson.demonstration.output} label="Expected result" />}
      </div>
      <div className="prep-callout"><b>Key takeaways</b><ul className="lesson-list">{lesson.takeaways.map((item) => <li key={item}>{item}</li>)}</ul></div>
      <div className="challenge-complete">
        <button type="button" className="learn-button" disabled={read} onClick={onRead}>{read ? 'Lesson read ✓' : 'Mark lesson as read'}</button>
      </div>
    </>
  )
}

export function InterviewQuestions({ lesson }: { lesson: Lesson }) {
  return (
    <>
      {lesson.interview.map((item, n) => (
        <details className="prep-question" key={item.question}>
          <summary>{n + 1}. {item.question}</summary>
          <p>{item.answer}</p>
          <p className="lesson-why"><b>What interviewers look for:</b> {item.explanation}</p>
        </details>
      ))}
    </>
  )
}

type TestRun = { pass: boolean; got: string; error: string }
const normalize = (text: string) => text.replace(/\r\n/g, '\n').trim().split('\n').map((line) => line.trimEnd()).join('\n')

function readDraft(key: string, fallback: string) {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}
function writeDraft(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* storage unavailable */ }
}

/** Coding problem with real test runs, or a practical exercise with a self-review checklist. */
export function Practice({ practice, draftKey, done, onDone }: { practice: Lesson['practice']; draftKey: string; done: boolean; onDone: () => void }) {
  const [showSolution, setShowSolution] = useState(false)
  useEffect(() => setShowSolution(false), [draftKey])
  return (
    <>
      <p className="lesson-meta"><span className={`lesson-level lesson-level-${practice.difficulty.toLowerCase()}`}>{practice.difficulty}</span>{practice.kind === 'coding' ? LANGUAGE_NAMES[practice.language] : 'Practical exercise'}</p>
      <p><b>Objective:</b> {practice.objective}</p>
      <p>{practice.statement}</p>
      {practice.kind === 'coding'
        ? <CodingTask practice={practice} draftKey={draftKey} done={done} onDone={onDone} />
        : <ExerciseTask practice={practice} draftKey={draftKey} done={done} onDone={onDone} />}
      <button type="button" className="learn-button learn-button-quiet" onClick={() => setShowSolution(!showSolution)}>{showSolution ? 'Hide solution' : 'Show solution'}</button>
      {showSolution && (practice.kind === 'coding' ? (
        <div className="lesson-block">
          <CodeBlock code={{ language: LANGUAGE_NAMES[practice.language], source: practice.solution }} label="Expected solution" />
          <h4>Step-by-step explanation</h4>
          <ol className="lesson-list">{practice.explanation.map((step) => <li key={step}>{step}</li>)}</ol>
        </div>
      ) : (
        <div className="prep-callout"><b>Sample answer</b><p className="lesson-pre">{practice.sample_answer}</p></div>
      ))}
    </>
  )
}

function CodingTask({ practice, draftKey, done, onDone }: { practice: CodingPractice; draftKey: string; done: boolean; onDone: () => void }) {
  const [code, setCode] = useState(() => readDraft(draftKey, practice.starter))
  const [runs, setRuns] = useState<TestRun[]>([])
  const [running, setRunning] = useState(false)
  useEffect(() => { setCode(readDraft(draftKey, practice.starter)); setRuns([]) }, [draftKey, practice.starter])

  async function runTests() {
    setRunning(true)
    const results: TestRun[] = []
    for (const test of practice.tests) {
      const result = await runProgram(practice.language, code, test.input)
      results.push({ pass: result.ok && normalize(result.stdout) === normalize(test.output), got: result.stdout, error: result.ok ? '' : result.stderr || result.status })
      setRuns([...results])
      if (!result.ok && /busy|unavailable|reach/i.test(result.status)) break
    }
    setRunning(false)
    if (results.length === practice.tests.length && results.every((r) => r.pass)) onDone()
  }

  const passed = runs.filter((r) => r.pass).length
  return (
    <>
      <div className="lesson-io">
        <div><b>Input</b><p className="lesson-pre">{practice.input_format}</p></div>
        <div><b>Output</b><p className="lesson-pre">{practice.output_format}</p></div>
      </div>
      <div className="lesson-io">
        <CodeBlock code={practice.example.input || '(no input)'} label="Example input" />
        <CodeBlock code={practice.example.output} label="Example output" />
      </div>
      <h4>Constraints</h4>
      <ul className="lesson-list">{practice.constraints.map((item) => <li key={item}>{item}</li>)}</ul>
      {practice.language === 'javascript' && <p className="learn-muted">JavaScript runs in your browser. The input is available as a string named <code>stdin</code>; print answers with <code>console.log</code>.</p>}
      <label className="prep-editor-label" htmlFor={`code-${draftKey}`}>Your solution ({LANGUAGE_NAMES[practice.language]})</label>
      <textarea id={`code-${draftKey}`} className="prep-editor" rows={14} spellCheck={false} value={code}
        onChange={(event) => { setCode(event.target.value); writeDraft(draftKey, event.target.value) }}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
          event.preventDefault()
          const el = event.currentTarget
          const next = `${code.slice(0, el.selectionStart)}    ${code.slice(el.selectionEnd)}`
          const caret = el.selectionStart + 4
          setCode(next); writeDraft(draftKey, next)
          requestAnimationFrame(() => el.setSelectionRange(caret, caret))
        }} />
      <div className="challenge-complete">
        <button type="button" className="learn-button" disabled={running} onClick={() => void runTests()}>{running ? `Running test ${runs.length + 1} of ${practice.tests.length}…` : 'Run tests'}</button>
        <button type="button" className="learn-button learn-button-quiet" disabled={running} onClick={() => { setCode(practice.starter); writeDraft(draftKey, practice.starter); setRuns([]) }}>Reset code</button>
        {done && <span className="lesson-pass">Practice solved ✓</span>}
      </div>
      {practice.language !== 'javascript' && <p className="learn-muted">{LANGUAGE_NAMES[practice.language]} runs on a free public code runner (Judge0); do not paste private data. Heavy use may be rate-limited.</p>}
      {runs.length > 0 && (
        <div className="lesson-tests" role="status">
          <p><b>{passed} of {practice.tests.length} tests passed</b>{runs.length === practice.tests.length && passed === practice.tests.length ? ' — well done!' : ''}</p>
          {runs.map((run, i) => (
            <details key={i} className={run.pass ? 'pass' : 'fail'} open={!run.pass}>
              <summary>Test {i + 1}: {run.pass ? 'passed' : 'failed'}</summary>
              {!run.pass && (
                <div className="lesson-io">
                  <CodeBlock code={practice.tests[i].input || '(no input)'} label="Input" />
                  <CodeBlock code={practice.tests[i].output} label="Expected" />
                  <CodeBlock code={run.error ? `${run.got}${run.error}` : run.got || '(no output)'} label="Your output" />
                </div>
              )}
            </details>
          ))}
        </div>
      )}
    </>
  )
}

function ExerciseTask({ practice, draftKey, done, onDone }: { practice: ExercisePractice; draftKey: string; done: boolean; onDone: () => void }) {
  const [answer, setAnswer] = useState(() => readDraft(draftKey, ''))
  const [checks, setChecks] = useState<boolean[]>([])
  useEffect(() => { setAnswer(readDraft(draftKey, '')); setChecks([]) }, [draftKey])
  const ready = answer.trim().length >= 80 && practice.checklist.every((_, i) => checks[i])
  return (
    <>
      <p><b>Deliverable:</b> {practice.deliverable}</p>
      <h4>Steps</h4>
      <ol className="lesson-list">{practice.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      <label className="prep-editor-label" htmlFor={`answer-${draftKey}`}>Your answer</label>
      <textarea id={`answer-${draftKey}`} className="prep-editor" rows={8} value={answer} onChange={(event) => { setAnswer(event.target.value); writeDraft(draftKey, event.target.value) }} />
      <h4>Self-review checklist</h4>
      <div className="challenge-checklist">
        {practice.checklist.map((item, i) => (
          <label key={item}><input type="checkbox" checked={checks[i] ?? false} onChange={(event) => setChecks((current) => { const next = [...current]; next[i] = event.target.checked; return next })} />{item}</label>
        ))}
      </div>
      <div className="challenge-complete">
        <button type="button" className="learn-button" disabled={done || !ready} onClick={onDone}>{done ? 'Exercise completed ✓' : 'Mark exercise complete'}</button>
        {!done && !ready && <small>Write your answer (at least a few sentences) and tick every checklist item.</small>}
      </div>
    </>
  )
}

/** Five questions with explanations. Passing needs PASS_SCORE correct; learners can retry. */
export function Quiz({ quiz, bestScore, onSubmit, children }: { quiz: QuizQuestion[]; bestScore: number | undefined; onSubmit: (score: number) => void; children?: ReactNode }) {
  const [answers, setAnswers] = useState<(number | undefined)[]>([])
  const [submitted, setSubmitted] = useState(false)
  useEffect(() => { setAnswers([]); setSubmitted(false) }, [quiz])
  const score = quiz.reduce((sum, q, i) => sum + (answers[i] === q.answer ? 1 : 0), 0)
  const complete = quiz.every((_, i) => answers[i] !== undefined)
  return (
    <>
      {children}
      {quiz.map((q, i) => (
        <fieldset className="prep-quiz-question" key={q.question}>
          <legend>{i + 1}. {q.question}</legend>
          {q.code && <CodeBlock code={q.code} />}
          {q.options.map((option, n) => (
            <label key={option} className={submitted ? (n === q.answer ? 'correct' : answers[i] === n ? 'incorrect' : '') : ''}>
              <input type="radio" name={`quiz-${i}`} checked={answers[i] === n} disabled={submitted} onChange={() => setAnswers((current) => { const next = [...current]; next[i] = n; return next })} />{option}
            </label>
          ))}
          {submitted && <p className="quiz-explanation">{q.explanation}</p>}
        </fieldset>
      ))}
      <div className="learn-card-actions">
        {!submitted
          ? <button type="button" className="learn-button" disabled={!complete} onClick={() => { setSubmitted(true); onSubmit(score) }}>Submit answers</button>
          : <button type="button" className="learn-button learn-button-quiet" onClick={() => { setAnswers([]); setSubmitted(false) }}>Try again</button>}
      </div>
      {submitted && <p className="quiz-result">Score: {score} / {quiz.length}. {score >= PASS_SCORE ? 'Quiz passed.' : `You need ${PASS_SCORE} correct to pass. Review the explanations and try again.`}</p>}
      {!submitted && bestScore !== undefined && <p className="learn-muted">Best score so far: {bestScore} / {quiz.length}{bestScore >= PASS_SCORE ? ' (passed)' : ''}.</p>}
    </>
  )
}
