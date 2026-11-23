/**
 * Public URLs for live content. A published item has nothing to preview, and a `?preview=` link is noindex,
 * so the admin offers the clean public URL instead (the one to share or paste into Search Console).
 */
export const SITE_URL = 'https://codinghubs.in'

export const PUBLIC_BASE = {
  blogs: '/blog',
  'case-studies': '/case-studies',
  projects: '/projects',
  'project-guides': '/project-guides',
} as const

/** Live on the website now: published, or scheduled with its time already reached. */
export function isLiveNow(status: string, publishedAt: string | null | undefined): boolean {
  if (status === 'published') return true
  if (status !== 'scheduled' || !publishedAt) return false
  return new Date(publishedAt).getTime() <= Date.now()
}

export function publicUrl(base: string, slug: string): string {
  return `${SITE_URL}${base}/${slug}`
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
