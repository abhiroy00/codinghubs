import { Link } from 'react-router-dom'
import { FsIcon } from './icons'

const PATHWAYS = [
  { number: '01', title: 'Courses', detail: 'AI, development, data & design', href: '/courses/', icon: 'i-code' },
  { number: '02', title: 'Interview Prep', detail: 'Your 30-day learning roadmap', href: '/interview-prep/', icon: 'i-map' },
  { number: '03', title: 'Book a Tutor', detail: 'Learn with personal guidance', href: '/book-a-tutor/', icon: 'i-users' },
  { number: '04', title: 'Latest Jobs', detail: 'Explore your next opportunity', href: '/latest-jobs/', icon: 'i-compass' },
]

export function HomePathways() {
  return (
    <nav className="home-pathways" aria-label="Explore Coding Hubs">
      <div className="wrap pathways-grid">
        {PATHWAYS.map((item) => (
          <Link className="pathway" to={item.href} key={item.href}>
            <span className="pathway-number">{item.number}</span>
            <FsIcon id={item.icon} />
            <span className="pathway-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
            <span className="pathway-arrow" aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
