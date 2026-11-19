import type { HeroClip } from './HeroVideo'
import './page-banner.css'

type Visual = 'neural' | 'robot' | 'network'
const THEMES: Record<HeroClip, { label: string; visual: Visual }> = {
  courses: { label: 'BUILD YOUR FUTURE WITH AI', visual: 'neural' },
  'course-detail': { label: 'FROM CURIOSITY TO CAPABILITY', visual: 'neural' },
  'interview-prep': { label: 'PRACTICE. THINK. MOVE FORWARD.', visual: 'robot' },
  'interview-prep-detail': { label: 'YOUR NEXT CHAPTER STARTS HERE', visual: 'robot' },
  faq: { label: 'GOOD QUESTIONS. CLEAR ANSWERS.', visual: 'robot' },
  ai: { label: 'INTELLIGENCE, PUT TO WORK', visual: 'robot' },
  'ai-tools': { label: 'EXPLORE WHAT AI CAN DO', visual: 'robot' },
  blog: { label: 'IDEAS FOR A CHANGING WORLD', visual: 'network' },
  'blog-article': { label: 'EXPLORE. UNDERSTAND. CREATE.', visual: 'network' },
  projects: { label: 'TURN YOUR IDEAS INTO REALITY', visual: 'network' },
  'project-guides': { label: 'THE NEXT THING YOU BUILD', visual: 'network' },
  'book-a-tutor': { label: 'HUMAN GUIDANCE. NEW POSSIBILITIES.', visual: 'robot' },
  'latest-jobs': { label: 'SKILLS MEET OPPORTUNITY', visual: 'network' },
  'our-work': { label: 'BUILT WITH PURPOSE', visual: 'network' },
  learn: { label: 'UNDERSTAND THE INTELLIGENCE', visual: 'neural' },
  locations: { label: 'YOUR WORLD. YOUR NEXT CHAPTER.', visual: 'neural' },
  'location-detail': { label: 'LEARN TODAY. BUILD TOMORROW.', visual: 'neural' },
  policies: { label: 'CLARITY AT EVERY STEP', visual: 'network' },
}

/** Original AI imagery for inner pages. Home keeps its existing hero. */
export function PageBannerArt({ clip }: { clip: HeroClip }) {
  const { label, visual } = THEMES[clip]
  return (
    <div className={`page-banner-art page-banner-art--${visual}`} aria-hidden="true">
      <picture className="pb-media">
        {/* AVIF first (about half the bytes), WebP fallback; phones get the 768px file. */}
        <source media="(max-width: 767px)" srcSet={`/assets/banners/ai-${visual}-768.avif`} type="image/avif" />
        <source media="(max-width: 767px)" srcSet={`/assets/banners/ai-${visual}-768.webp`} type="image/webp" />
        <source srcSet={`/assets/banners/ai-${visual}-1440.avif`} type="image/avif" />
        <img src={`/assets/banners/ai-${visual}-1440.webp`} width={1440} height={visual === 'neural' ? 960 : 617} alt="" decoding="async" fetchPriority="high" />
      </picture>
      <div className="pb-shade" />
      <div className="pb-caption"><span className="pb-signal"><i /><i /><i /></span>{label}<span className="pb-caption-line" /></div>
      <div className="pb-bottom-rule" />
    </div>
  )
}
