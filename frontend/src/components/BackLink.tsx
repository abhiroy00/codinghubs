import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { previousPath } from '../lib/nav'

/** "Back to the list": returns to the exact earlier page (filters and scroll kept) when the visitor came from it, otherwise opens the list. */
export function BackLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <Link
      to={to}
      className={className}
      onClick={(e) => {
        if (previousPath().replace(/\/$/, '') === to.replace(/\/$/, '')) {
          e.preventDefault()
          navigate(-1)
        }
      }}
    >
      {children}
    </Link>
  )
}
