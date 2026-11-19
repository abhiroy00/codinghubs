import { Link } from 'react-router-dom'
import { PROJECTS, PROJECT_CATEGORIES } from '../../data/projects'
import { FsIcon } from './icons'
import { ProjectShowreel } from './ProjectShowreel'
import './home-projects.css'

/** Reference-inspired split section, using the same real portfolio as /our-work. */
export function HomeProjects() {
  return (
    <section className="sec home-projects" id="project-showcase" aria-labelledby="hp-title">
      <div className="wrap hp-layout">
        <ProjectShowreel />

        <div className="hp-copy">
          <p className="eyebrow">From ideas to working products</p>
          <h2 id="hp-title" className="h2">Real projects.{' '}<br /><span className="marker">Real-world impact.</span></h2>
          <p className="hp-intro">Explore the AI applications, business platforms and websites in our portfolio. See how code becomes a product that solves a real problem.</p>
          <ul className="hp-highlights">
            <li><span aria-hidden="true">✓</span>AI applications &amp; intelligent workflows</li>
            <li><span aria-hidden="true">✓</span>Websites &amp; full stack platforms</li>
            <li><span aria-hidden="true">✓</span>E-commerce &amp; business systems</li>
            <li><span aria-hidden="true">✓</span>Real screenshots &amp; live project links</li>
          </ul>
          <div className="hp-stats" aria-label="Portfolio at a glance">
            <p><strong>{PROJECTS.length}</strong><span>Projects to explore</span></p>
            <p><strong>{PROJECT_CATEGORIES.length}</strong><span>Disciplines</span></p>
            <p><strong>{PROJECTS.filter(project => project.href).length}</strong><span>Live links</span></p>
          </div>
          <Link className="btn hp-all" to="/our-work">View all {PROJECTS.length} projects <FsIcon id="i-arrow" /></Link>
          <p className="hp-note">Watch our project showreel or explore the full portfolio.</p>
        </div>
      </div>
    </section>
  )
}
