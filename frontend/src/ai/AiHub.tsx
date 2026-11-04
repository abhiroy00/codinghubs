import { Link } from 'react-router-dom'
import { LearnFrame } from '../learning/LearnFrame'
import { AI_TOOLS } from './ai-shared'
import '../learning/learning.css'
import './ai.css'

/** Landing page for the four AI tools. Public: the tools themselves ask people to log in. */
export function AiHub() {
  return (
    <LearnFrame>
      <div className="learn-shell ai-shell">
        <header className="learn-hero">
          <p className="learn-kicker">AI INTERVIEW COACH</p>
          <h1>Practise, get feedback, get interview ready</h1>
          <p>Four AI tools that work alongside the 30-day roadmaps. Feedback is a guide: it can be wrong, and it never guarantees a job.</p>
        </header>
        <div className="ai-grid">
          {AI_TOOLS.map((tool) => (
            <Link key={tool.path} to={tool.path} className="ai-card">
              <h2>{tool.title}</h2>
              <p>{tool.text}</p>
              <span className="learn-button learn-button-quiet" aria-hidden="true">Open</span>
            </Link>
          ))}
        </div>
      </div>
    </LearnFrame>
  )
}
