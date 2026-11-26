import { NavLink } from 'react-router-dom'
import { HeaderDropdown, type DropdownControl } from '../components/HeaderDropdown'

const LINKS = [
  ['/ai-tools', 'AI Tools'],
  ['/blog', 'Blog'],
  ['/notes/', 'Notes'],
  ['/newsletter/', 'Newsletter'],
  ['/case-studies', 'Case Studies'],
  ['/#session', 'About the Live Demo'],
] as const

export function ResourcesMenu(props: DropdownControl) {
  return <HeaderDropdown {...props} label="Resources">
    {LINKS.map(([to, label]) => <li key={to}><NavLink to={to}>{label}</NavLink></li>)}
  </HeaderDropdown>
}
