import { Link } from 'react-router-dom'
import { GENAI_LEVELS,genaiPath } from './genai-content'
import { levelProgress,useRoadmapProgress } from './useRoadmapProgress'
import './genai-roadmap.css'
export function GenAIRoadmap() {
  const {value}=useRoadmapProgress()
  return <section className="genai-roadmap" aria-label="30-day Generative AI learning roadmap"><ol className="genai-path">{GENAI_LEVELS.map(level=>{
    const progress=levelProgress(level.level,value)
    return <li key={level.level} className={`genai-step genai-color-${level.level}`}><article className="genai-card"><div className="genai-card-top"><div><span className="genai-eyebrow">LEVEL {level.level} · DAYS {level.start}–{level.end}</span><h2>{level.title}</h2></div><div className="genai-sculpture" aria-hidden="true"><i/><i/><i/><b>{['◇','⌘','⌁','✦'][level.level-1]}</b></div></div><div className="genai-card-bottom"><dl><div><dt>Articles</dt><dd>{level.articleCount}</dd></div><div><dt>Questions</dt><dd>{level.questionCount}</dd></div></dl><Link className="genai-arrow" to={genaiPath(level.level)} aria-label={`Open Level ${level.level}: ${level.title}`}>↗</Link></div><div className="genai-card-progress"><span>{progress.percent}% complete</span><progress value={progress.done} max={progress.total} aria-label={`Level ${level.level} progress`}/></div></article></li>
  })}</ol></section>
}
