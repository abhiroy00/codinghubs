import { Link } from 'react-router-dom'

export interface Crumb {
  name: string
  to?: string
}

/** Visible breadcrumb trail (the last item is the current page). Used on dark hero banners. */
export function Breadcrumbs({ items, light = false }: { items: Crumb[]; light?: boolean }) {
  return (
    <nav aria-label="Breadcrumb" className={`crumb-nav${light ? ' crumb-light' : ''}`}>
      <ol className="breadcrumb">
        {items.map((c, i) => {
          const last = i === items.length - 1
          return (
            <li key={c.name}>
              {i > 0 && <span className="sep" aria-hidden="true">›</span>}
              {last || !c.to ? <span className="current" aria-current={last ? 'page' : undefined}>{c.name}</span> : <Link to={c.to}>{c.name}</Link>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
