/** Hero carousel photos (HeroSlider.tsx). Kept apart from the component so the prerender can use the same values. */
export type Slide = {
  /** File stem inside /assets/hero/. */
  name: string
  /** Available WebP widths (never upscaled beyond the source). */
  widths: number[]
  width: number
  height: number
  alt: string
  title: string
  detail: string
  /** cover fills the card; contain keeps wide photos and their banner text whole over a soft blurred fill. */
  fit: 'cover' | 'contain'
  position?: string
}

export const SLIDES: Slide[] = [
  {
    name: 'classroom-live-coding-session',
    widths: [720, 1440],
    width: 1440,
    height: 1080,
    alt: 'Students with laptops around a classroom table while a trainer walks through code on a wall screen',
    title: 'Classroom sessions',
    detail: 'Small groups, coding together',
    fit: 'cover',
    position: '50% 55%',
  },
  {
    name: 'gitm-student-group-photo',
    widths: [720, 1440],
    width: 1440,
    height: 681,
    alt: 'Large group photo of students and trainers on stage at Ganga Institute of Technology and Management',
    title: 'Campus sessions',
    detail: 'With students at GITM',
    fit: 'contain',
  },
  {
    name: 'team-festive-celebration',
    widths: [720, 1200],
    width: 1200,
    height: 1600,
    alt: 'Three people in festive clothes exchanging a gift in an office decorated with marigold garlands',
    title: 'Celebrating together',
    detail: 'Festive moments we share',
    fit: 'cover',
    position: '50% 32%',
  },
  {
    name: 'gitm-aarambh-data-science-careers-talk',
    widths: [720, 1440],
    width: 1440,
    height: 1080,
    alt: 'Trainer presenting a slide on top data science careers at the Aarambh 2026 student induction programme',
    title: 'Career talks',
    detail: 'Data science careers at Aarambh 2026',
    fit: 'cover',
    position: '45% 40%',
  },
  {
    name: 'gitm-aarambh-felicitation',
    widths: [714],
    width: 714,
    height: 319,
    alt: 'Four people on stage exchanging a certificate at the Aarambh 2026 student induction programme',
    title: 'Student induction',
    detail: 'Felicitation at the Aarambh 2026 programme',
    fit: 'contain',
  },
]

export const SIZES = '(max-width: 760px) 82vw, 640px'
export const src = (s: Slide) => `/assets/hero/${s.name}.jpg`
export const srcSet = (s: Slide) => s.widths.map((w) => `/assets/hero/${s.name}-${w}.webp ${w}w`).join(', ')

/** Preload for the first (eagerly loaded) slide. The prerender puts it in <head>; it uses the exact srcset/sizes of
 * the <img> so the browser reuses the preloaded file instead of downloading a second candidate. */
export const FIRST_SLIDE_PRELOAD = { imagesrcset: srcSet(SLIDES[0]), imagesizes: SIZES }
