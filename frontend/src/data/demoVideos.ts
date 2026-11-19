/**
 * YouTube demo classes shown in the "Demo Videos" grid on the homepage (#demo-classes).
 *
 * To add a video: put its thumbnail in /public/demo/ (e.g. /public/demo/genai-intro.webp, 16:9, ~1280×720)
 * and add a row below. Any YouTube link form works (watch, youtu.be, shorts, embed).
 * If `thumbnail` is left empty, YouTube's own thumbnail is used.
 */
export interface DemoVideo {
  id: string
  course: string
  thumbnail: string
  youtubeUrl: string
}

export const DEMO_VIDEOS: DemoVideo[] = [
  // { id: 'genai-intro', course: 'Generative AI', thumbnail: '/demo/genai-intro.webp', youtubeUrl: 'https://www.youtube.com/watch?v=XXXXXXXXXXX' },
]

/** Extracts the 11-character video id from watch, youtu.be, shorts, embed and live URLs; null if none. */
export function getYouTubeId(url: string): string | null {
  const trimmed = url.trim()
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed
  try {
    const u = new URL(trimmed)
    const host = u.hostname.replace(/^www\.|^m\./, '')
    if (host === 'youtu.be') return valid(u.pathname.slice(1).split('/')[0])
    if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
      const v = u.searchParams.get('v')
      if (v) return valid(v)
      const [, kind, id] = u.pathname.split('/')
      if (['shorts', 'embed', 'live', 'v'].includes(kind)) return valid(id)
    }
  } catch {
    /* not a URL */
  }
  return null
}

const valid = (id: string | undefined) => (id && /^[\w-]{11}$/.test(id) ? id : null)

/** Thumbnail to show: the uploaded file, or YouTube's high-quality frame as a fallback. */
export const thumbnailFor = (v: DemoVideo, id: string) => v.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
