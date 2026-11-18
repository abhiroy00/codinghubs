import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { FsIcon } from './icons'
import { CATEGORY_TABS } from './data'
import { PROGRAMS } from './programs'
import { HOME_CHALLENGE, HOME_COURSES, HOME_PROJECT, HOME_ROADMAP, roadmapLevelHref } from './learning-hub'

function Challenge() {
  const id = useId()
  const [choice, setChoice] = useState('')
  const correct = choice === HOME_CHALLENGE.answer
  return (
    <article className="hl-card hl-challenge" aria-labelledby={`${id}-t`}>
      <p className="hl-kicker"><FsIcon id="i-term" />Two-minute challenge</p>
      <h3 id={`${id}-t`}>{HOME_CHALLENGE.question}</h3>
      <pre className="hl-code" aria-label="Python code"><code>{HOME_CHALLENGE.code}</code></pre>
      <fieldset className="hl-options">
        <legend className="sr-only">Choose the output</legend>
        {HOME_CHALLENGE.options.map((option) => (
          <label key={option} className={choice === option ? (correct ? 'is-right' : 'is-wrong') : ''}>
            <input type="radio" name={`${id}-opt`} value={option} checked={choice === option} onChange={() => setChoice(option)} />
            <code>{option}</code>
          </label>
        ))}
      </fieldset>
      <p className="hl-feedback" role="status" aria-live="polite">
        {choice ? (correct ? 'Correct. ' : `Not quite — ${choice} is not the output. `) : ''}
      </p>
      <details className="hl-answer" open={choice !== '' || undefined}>
        <summary>Show answer &amp; explanation</summary>
        <p><strong>Answer: <code>{HOME_CHALLENGE.answer}</code></strong></p>
        <p>{HOME_CHALLENGE.explanation}</p>
        <Link to={HOME_CHALLENGE.lesson.href} className="hl-link">Read the lesson: {HOME_CHALLENGE.lesson.title} <span aria-hidden="true">→</span></Link>
      </details>
    </article>
  )
}

/** Free learning content right below the hero: a roadmap, a challenge and a beginner project. */
export function HomeLearn() {
  return (
    <section className="sec ch-learn" id="learn-free" aria-labelledby="hl-title">
      <div className="wrap">
        <div className="hl-head">
          <div>
            <p className="eyebrow">Free to use · no sign-up</p>
            <h2 id="hl-title" className="h2">Start learning <span className="marker">right now</span></h2>
          </div>
          <p className="sub">A roadmap to follow, a challenge to test yourself and a project to build — straight from our course material.</p>
        </div>

        <div className="hl-grid">
          <article className="hl-card hl-roadmap" aria-labelledby="hl-roadmap-t">
            <p className="hl-kicker"><FsIcon id="i-map" />Roadmap</p>
            <h3 id="hl-roadmap-t">{HOME_ROADMAP.title}</h3>
            <ol className="hl-steps">
              {HOME_ROADMAP.levels.map((level) => (
                <li key={level.level}>
                  <Link to={roadmapLevelHref(level.level)}>
                    <span className="hl-days">Days {level.start}–{level.end}</span>
                    <strong>{level.title}</strong>
                    <small>{level.articles} lessons</small>
                  </Link>
                </li>
              ))}
            </ol>
            <Link to={HOME_ROADMAP.href} className="hl-link">Open the full roadmap <span aria-hidden="true">→</span></Link>
          </article>

          <Challenge />

          <article className="hl-card hl-project" aria-labelledby="hl-project-t">
            <p className="hl-kicker"><FsIcon id="i-code" />Beginner project</p>
            <h3 id="hl-project-t">{HOME_PROJECT.name}</h3>
            <p>{HOME_PROJECT.description}</p>
            <ol className="hl-plan">
              {HOME_PROJECT.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <p className="hl-outcome"><strong>You finish with:</strong> {HOME_PROJECT.outcome.replace(/^A /, 'a ')}</p>
            <ul className="hl-tags" aria-label="Skills">
              {HOME_PROJECT.skills.map((skill) => <li key={skill}>{skill}</li>)}
            </ul>
            <Link to={HOME_PROJECT.course.href} className="hl-link">From {HOME_PROJECT.course.name} <span aria-hidden="true">→</span></Link>
          </article>
        </div>
      </div>
    </section>
  )
}

/** Popular courses (the existing homepage course list) and the 15-day programs. */
export function HomeCourses({ onDemo }: { onDemo: (course?: string) => void }) {
  const [tab, setTab] = useState('all')
  const visible = tab === 'all' ? HOME_COURSES : HOME_COURSES.filter((course) => course.cat === tab)
  return (
    <section className="sec hc" id="courses" aria-labelledby="hc-title">
      <div className="wrap">
        <div className="hl-head">
          <div>
            <p className="eyebrow">Popular courses</p>
            <h2 id="hc-title" className="h2">Pick a path and <span className="marker">try it free</span></h2>
          </div>
          <p className="sub">Every course starts with a free 2-hour live demo. Choose a course to see its modules, projects and roadmap.</p>
        </div>
        <div className="hc-tabs" role="group" aria-label="Filter courses by category">
          {CATEGORY_TABS.map((t) => (
            <button key={t.filter} type="button" aria-pressed={tab === t.filter} onClick={() => setTab(t.filter)}>
              {t.filter === 'all' ? 'All' : t.label}
            </button>
          ))}
        </div>
        <ul className="hc-grid">
          {visible.map((course) => (
            <li key={course.slug} className="hc-card">
              <p className="hc-cat"><FsIcon id={course.icon} />{course.catLabel}</p>
              <h3><Link to={`/courses/${course.slug}/`}>{course.title}</Link></h3>
              <p>{course.desc}</p>
              <ul className="hc-meta" aria-label="Format">
                <li>Live online</li>
                <li>30-day roadmap</li>
              </ul>
              <button type="button" className="hc-demo" onClick={() => onDemo(course.title)} aria-label={`Book a free demo for ${course.title}`}>
                Free demo <FsIcon id="i-arrow" />
              </button>
            </li>
          ))}
        </ul>
        <p className="hc-all"><Link to="/courses/">Browse all courses <span aria-hidden="true">→</span></Link></p>

        <div className="hc-programs" aria-labelledby="hc-prog-title">
          <h3 id="hc-prog-title">15-day programs</h3>
          <ul>
            {PROGRAMS.map((program) => (
              <li key={program.slug}>
                <Link to={`/program/${program.slug}`}>
                  <span className="hc-days">{program.days.length} days</span>
                  <strong>{program.title}</strong>
                  <small>{program.tagline}</small>
                  <span className="hc-go" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
