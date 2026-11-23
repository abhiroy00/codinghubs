import { Link } from 'react-router-dom'
import { COURSE_ROADMAPS,courseLevelPath } from './course-roadmap-content'
import { levelProgress,useRoadmapProgress } from './useRoadmapProgress'
import { GenAIRoadmap } from './GenAIRoadmap'
import { useAuth } from '../lib/auth-context'
import './genai-roadmap.css'
export function CourseRoadmap({slug}:{slug:string}) {
  return slug==='generative-ai'?<GenAIRoadmap/>:<SubjectRoadmap key={slug} slug={slug}/>
}
/** Direct links from indexable course overviews to substantive learning levels. */
export function CourseLevelLinks({slug}:{slug:string}) {
 const course=COURSE_ROADMAPS[slug]
 if(!course||course.primary!==slug)return null
 const levels=course.levels.filter(l=>l.articleCount>0)
 if(!levels.length)return null
 return <nav className="learn-card-actions" aria-label="Available learning levels">{levels.map(l=><Link key={l.level} to={courseLevelPath(slug,l.level)}>Level {l.level}: {l.title} →</Link>)}</nav>
}
function SubjectRoadmap({slug}:{slug:string}) {
 const course=COURSE_ROADMAPS[slug]
 const {value}=useRoadmapProgress(slug)
 // Levels without a published lesson are not linked publicly; signed-in learners keep their study-brief workspace.
 const {user}=useAuth()
 if(!course)return null
 return <section className="genai-roadmap" aria-label={`30-day ${course.name} learning roadmap`}><ol className="genai-path">{course.levels.map(level=>{
  const progress=levelProgress(level.level,value,slug)
  return <li key={level.level} className={`genai-step genai-color-${level.level}`}><article className="genai-card"><div className="genai-card-top"><div><span className="genai-eyebrow">LEVEL {level.level} · DAYS {level.start}–{level.end}</span><h2>{level.title}</h2></div><div className="genai-sculpture" aria-hidden="true"><i/><i/><i/><b>{['◇','⌘','⌁','✦'][level.level-1]}</b></div></div><div className="genai-card-bottom"><dl><div><dt>Articles</dt><dd>{level.articleCount}</dd></div><div><dt>Questions</dt><dd>{level.questionCount}</dd></div></dl>{level.articleCount||user?<Link className="genai-arrow" to={courseLevelPath(slug,level.level)} aria-label={`Open ${course.name} Level ${level.level}: ${level.title}`}>↗</Link>:null}</div><div className="genai-card-progress"><span>{progress.percent}% complete</span><progress value={progress.done} max={progress.total} aria-label={`Level ${level.level} progress`}/></div>{!level.articleCount&&<p className="course-roadmap-status">Lessons coming soon</p>}</article></li>
 })}</ol></section>
}
