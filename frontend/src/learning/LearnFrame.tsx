import type { ReactNode } from 'react'
import { PageFrame } from '../content-pages/shared'

/** Courses, interview prep and certificates share the site's main header, footer and styles. */
export function LearnFrame({ children }: { children: ReactNode }) {
  return <PageFrame wide>{children}</PageFrame>
}
