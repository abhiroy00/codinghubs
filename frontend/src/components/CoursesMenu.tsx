import { NavLink } from 'react-router-dom'
import { HeaderDropdown, type DropdownControl } from './HeaderDropdown'

const LINKS = [
  ['/courses/', 'All Courses'],
  ['/brochures/', 'Course Brochures'],
  ['/book-a-tutor/', 'Book a Tutor'],
] as const

export function CoursesMenu(props: DropdownControl) {
  return <HeaderDropdown {...props} label="Courses" className="sh-courses">
    {LINKS.map(([to, label]) => <li key={to}><NavLink to={to} end>{label}</NavLink></li>)}
  </HeaderDropdown>
}
