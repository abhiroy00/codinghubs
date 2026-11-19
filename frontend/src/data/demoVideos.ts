/**
 * YouTube demo classes shown in the YouTube carousel on the /demo-videos page.
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

/** All demo classes live on the Coding Hub YouTube channel. */
export const DEMO_CHANNEL_URL = 'https://www.youtube.com/@codingnowai/videos'

export const DEMO_VIDEOS: DemoVideo[] = [
  { id: 'sql-ep1', course: 'MySQL Ep 1: What is SQL & how databases work', thumbnail: '', youtubeUrl: 'https://www.youtube.com/watch?v=Gpc-xAEmaGE' },
  { id: 'sql-ep2', course: 'MySQL Ep 2: Types of SQL & SQL operators', thumbnail: '', youtubeUrl: 'https://www.youtube.com/watch?v=NA9KkXxK4EA' },
  { id: 'sql-ep3', course: 'MySQL Ep 3: BETWEEN operator + 5 solved questions', thumbnail: '', youtubeUrl: 'https://www.youtube.com/watch?v=bMLyH67mF1I' },
  { id: 'sql-ep4', course: 'MySQL Ep 4: Constraints & relationships', thumbnail: '', youtubeUrl: 'https://www.youtube.com/watch?v=qqZStVP0jOQ' },
  { id: 'py-types', course: 'Python: Data types for beginners', thumbnail: '', youtubeUrl: 'https://www.youtube.com/watch?v=YvNX0l67CB8' },
  { id: 'py-loops', course: 'Python: Loops explained', thumbnail: '', youtubeUrl: 'https://www.youtube.com/watch?v=LEP0lMD7nU4' },
  { id: 'py-functions', course: 'Python: Functions, a complete guide', thumbnail: '', youtubeUrl: 'https://www.youtube.com/watch?v=J-Bu3U_4l6I' },
  { id: 'html-intro', course: 'HTML from scratch: Introduction', thumbnail: '', youtubeUrl: 'https://www.youtube.com/watch?v=6vunhd0thPw' },
  { id: 'css-intro', course: 'CSS introduction for full stack', thumbnail: '', youtubeUrl: 'https://www.youtube.com/watch?v=yQaT2Uiadb4' },
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
