import { NavLink } from 'react-router-dom'
import { HeaderDropdown, type DropdownControl } from './HeaderDropdown'

export function CareersMenu(props: DropdownControl) {
  return <HeaderDropdown {...props} label="Careers">
    <li><NavLink to="/interview/">Interview Prep</NavLink></li>
    <li><NavLink to="/latest-jobs/">Latest Jobs</NavLink></li>
  </HeaderDropdown>
}
