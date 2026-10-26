import { Link } from 'react-router-dom'

/** Header nav item: a plain link, styled like its siblings, that opens the /locations/ page listing every location. */
export function LocationsMenu({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link to="/locations/" onClick={onNavigate}>
      Locations
    </Link>
  )
}
