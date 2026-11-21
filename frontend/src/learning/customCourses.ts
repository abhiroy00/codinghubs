import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { CourseDefinition } from './catalog'

/** Courses created in the admin panel (backend apps/courses/pages.py). Catalogue courses stay in catalog.ts. */
export interface CustomCourseCard { slug: string; name: string; category: string; level: string; summary: string; duration: string; module_count: number }
export interface CustomCourse extends Omit<CustomCourseCard, 'module_count'> {
  introduction: string
  tools: string[]
  skills: string[]
  careers: string[]
  modules: { title: string; description: string; topics: string[] }[]
  projects: { name: string; description: string; skills: string[] }[]
  faqs: { question: string; answer: string }[]
  seo: { title: string; description: string; canonical: string; robots: string; og: { type: string; title: string; description: string; image: string; url: string }; json_ld: unknown }
}

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const

/** Shapes an admin-created course like a catalogue course so the existing cards can show it. */
export function toDefinition(c: CustomCourseCard): CourseDefinition {
  return {
    slug: c.slug, name: c.name, category: c.category, track: 'development', focus: c.name, summary: c.summary, introduction: c.summary,
    tools: [], skills: [], careers: [], modules: Array.from({ length: c.module_count }, () => ({ title: '', description: '', topics: [] })),
    projects: [], faqs: [], days: [], hasCoding: false, custom: true, duration: c.duration || undefined,
    level: (LEVELS as readonly string[]).includes(c.level) ? (c.level as CourseDefinition['level']) : undefined,
  }
}

let cache: CustomCourseCard[] | null = null

export function useCustomCourses(): CourseDefinition[] {
  const [rows, setRows] = useState<CustomCourseCard[]>(cache ?? [])
  useEffect(() => {
    if (cache) return
    api.get<CustomCourseCard[]>('/courses/custom/').then(({ data }) => {
      cache = data
      setRows(data)
    }).catch(() => undefined)
  }, [])
  return rows.map(toDefinition)
}

interface InitialCourse { kind?: string; slug?: string; course?: CustomCourse }

/** The server-rendered page embeds the course (#__CONTENT__) so the first render needs no request. */
export function initialCustomCourse(slug: string): CustomCourse | null {
  if (typeof document === 'undefined') return null
  try {
    const data = JSON.parse(document.getElementById('__CONTENT__')?.textContent || 'null') as InitialCourse | null
    return data?.kind === 'course' && data.slug === slug && data.course ? data.course : null
  } catch {
    return null
  }
}

export const getCustomCourse = (slug: string) => api.get<CustomCourse>(`/courses/custom/${slug}/`).then((r) => r.data)
