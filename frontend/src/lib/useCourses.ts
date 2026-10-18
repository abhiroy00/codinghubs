import { useEffect, useState } from 'react'
import { api } from './api'
import type { Course, CourseCategory } from './types'

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results
}

export function useCourseCategories() {
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api
      .get('/courses/categories/')
      .then(({ data }) => {
        if (active) setCategories(unwrap<CourseCategory>(data))
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return { categories, loading }
}

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api
      .get('/courses/')
      .then(({ data }) => {
        if (active) setCourses(unwrap<Course>(data))
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return { courses, loading }
}
