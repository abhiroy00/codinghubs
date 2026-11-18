import type { HeroClip } from './HeroVideo'
import './page-banner.css'

type Illustration = 'learn' | 'build' | 'talk' | 'read' | 'career'
const THEMES: Record<HeroClip, { label: string; note: string; art: Illustration }> = {
  courses: { label: 'THE NEXT CHAPTER', note: 'Learn. Build. Become.', art: 'learn' },
  'course-detail': { label: 'YOUR LEARNING PATH', note: 'Small steps. Real skills.', art: 'learn' },
  'interview-prep': { label: 'PRACTICE WITH PURPOSE', note: 'Think it. Explain it.', art: 'talk' },
  'interview-prep-detail': { label: 'ONE DAY AT A TIME', note: 'Practice makes progress.', art: 'talk' },
  faq: { label: 'LET’S FIGURE IT OUT', note: 'Good questions start here.', art: 'talk' },
  ai: { label: 'YOUR AI WORKSPACE', note: 'A little help. A big leap.', art: 'build' },
  'ai-tools': { label: 'TOOLS FOR WHAT’S NEXT', note: 'Curiosity, meet possibility.', art: 'build' },
  blog: { label: 'IDEAS WORTH EXPLORING', note: 'Stay curious. Keep growing.', art: 'read' },
  'blog-article': { label: 'A FRESH PERSPECTIVE', note: 'Read. Reflect. Try it.', art: 'read' },
  projects: { label: 'MADE TO BE BUILT', note: 'Less theory. More doing.', art: 'build' },
  'project-guides': { label: 'FROM IDEA TO DONE', note: 'Your next build starts here.', art: 'build' },
  'book-a-tutor': { label: 'LEARN WITH A MENTOR', note: 'Your questions. Their experience.', art: 'talk' },
  'latest-jobs': { label: 'MAKE YOUR NEXT MOVE', note: 'Skills meet opportunity.', art: 'career' },
  'our-work': { label: 'IDEAS INTO IMPACT', note: 'Real work. Real possibilities.', art: 'build' },
  learn: { label: 'FOLLOW YOUR CURIOSITY', note: 'Make room for an “aha”.', art: 'learn' },
  locations: { label: 'LEARNING, CLOSER TO YOU', note: 'Your next chapter, from anywhere.', art: 'career' },
  'location-detail': { label: 'A WORLD OF POSSIBILITY', note: 'Start where you are.', art: 'career' },
  policies: { label: 'CLARITY COMES FIRST', note: 'The details, made clear.', art: 'read' },
}

/** Static, decorative artwork for inner pages. The home hero keeps its own media. */
export function PageBannerArt({ clip }: { clip: HeroClip }) {
  const theme = THEMES[clip]
  return (
    <div className={`page-banner-art page-banner-art--${theme.art}`} aria-hidden="true">
      <div className="pb-grid" />
      <div className="pb-illustration">
        <div className="pb-overline"><span /> CODING HUBS · SCHOOL OF AI</div>
        <svg viewBox="0 0 480 350" fill="none" focusable="false">
          <circle cx="250" cy="175" r="139" fill="#f4d96b" />
          <circle cx="250" cy="175" r="164" stroke="#d7cfb7" strokeDasharray="4 8" />
          <path d="M32 220C6 146 62 75 136 92M358 272c68 5 101-42 86-91" stroke="#1d3550" strokeWidth="2" strokeLinecap="round" />
          <path d="m128 83 12 10-14 7m309 93 9-15 11 13" stroke="#1d3550" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <g transform="rotate(-7 224 177)">
            <rect x="85" y="62" width="284" height="222" rx="10" fill="#172e48" />
            <rect x="77" y="54" width="284" height="222" rx="10" fill="#fffef9" stroke="#172e48" strokeWidth="2" />
            <path d="M78 90h282" stroke="#172e48" strokeWidth="2" />
            <circle cx="96" cy="73" r="4" fill="#f2cc52" /><circle cx="110" cy="73" r="4" fill="#abc9f6" /><circle cx="124" cy="73" r="4" fill="#cddbb9" />
            <text x="259" y="77" fill="#526078" fontFamily="monospace" fontSize="10">LET’S BEGIN ↗</text>
            {theme.art === 'build' ? <>
              <rect x="100" y="109" width="94" height="141" rx="5" fill="#eaf0fb" />
              <text x="112" y="161" fontFamily="monospace" fontSize="32" fontWeight="700" fill="#235ce0">{'</>'}</text>
              <path d="M112 183h66m-66 13h44m-44 13h55" stroke="#9eafc6" strokeWidth="4" strokeLinecap="round" />
              <path d="M216 122h114m-114 18h74m-74 18h94" stroke="#172e48" strokeWidth="5" strokeLinecap="round" />
              <rect x="211" y="184" width="125" height="65" rx="5" fill="#235ce0" />
              <path d="m229 230 20-20 19 8 21-26 29 3" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </> : theme.art === 'talk' ? <>
              <rect x="103" y="111" width="174" height="62" rx="12" fill="#235ce0" />
              <path d="m119 169-7 18 28-17" fill="#235ce0" />
              <text x="122" y="150" fontFamily="sans-serif" fontSize="26" fontWeight="700" fill="#fff">Hello, what if?</text>
              <rect x="166" y="190" width="171" height="58" rx="12" fill="#eaf0fb" />
              <circle cx="204" cy="219" r="6" fill="#172e48" /><circle cx="229" cy="219" r="6" fill="#172e48" /><circle cx="254" cy="219" r="6" fill="#172e48" />
              <path d="m309 243 12 17-2-19" fill="#eaf0fb" />
            </> : theme.art === 'career' ? <>
              <path d="M110 246h222M124 246v-38h53v38m0 0v-77h53v77m0 0V130h53v116" stroke="#172e48" strokeWidth="2" fill="#eaf0fb" />
              <path d="m123 176 54-34 51 2 64-37m-22 0h23v24" stroke="#235ce0" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="310" cy="220" r="23" fill="#235ce0" /><path d="m299 220 7 7 14-15" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </> : theme.art === 'read' ? <>
              <rect x="102" y="111" width="85" height="136" rx="4" fill="#235ce0" />
              <text x="116" y="163" fill="#fff" fontFamily="serif" fontSize="46" fontStyle="italic">Aa</text>
              <path d="M116 192h56m-56 13h43m-43 13h48" stroke="#b8d1ff" strokeWidth="3" strokeLinecap="round" />
              <path d="M209 122h119m-119 18h91m-91 18h111m-111 25h119m-119 15h106m-106 15h117m-117 15h76" stroke="#afbbc9" strokeWidth="4" strokeLinecap="round" />
            </> : <>
              <path d="m108 144 110-38 111 38-111 39-110-39Z" fill="#235ce0" />
              <path d="M151 160v44c39 24 93 24 134-1v-44" fill="#abc9f6" />
              <path d="M322 149v51" stroke="#172e48" strokeWidth="3" strokeLinecap="round" />
              <path d="M133 234h172m-147 13h122" stroke="#aab8c9" strokeWidth="4" strokeLinecap="round" />
            </>}
          </g>
          <g transform="rotate(8 371 101)">
            <rect x="321" y="68" width="112" height="63" rx="7" fill="#d7e6fa" stroke="#172e48" strokeWidth="1.5" />
            <text x="336" y="95" fill="#172e48" fontFamily="monospace" fontSize="12" fontWeight="700">{theme.art === 'build' ? 'IDEA → LIVE' : theme.art === 'talk' ? 'LET’S TALK' : theme.art === 'career' ? 'LEVEL UP ↗' : theme.art === 'read' ? 'NEW IDEAS' : 'STAY CURIOUS'}</text>
            <path d="M336 111h58" stroke="#235ce0" strokeWidth="3" strokeLinecap="round" />
          </g>
          <g transform="rotate(5 115 272)">
            <rect x="36" y="248" width="157" height="43" rx="22" fill="#172e48" />
            <circle cx="58" cy="270" r="10" fill="#f4d96b" /><path d="m54 270 3 3 5-6" stroke="#172e48" strokeWidth="2" strokeLinecap="round" />
            <text x="76" y="274" fill="#fffef9" fontFamily="monospace" fontSize="11">{theme.art === 'build' ? 'BUILD SOMETHING' : theme.art === 'career' ? 'KEEP MOVING' : 'MAKE IT CLICK'}</text>
          </g>
          <path d="m405 239 5 15 15 5-15 5-5 15-5-15-15-5 15-5 5-15ZM63 50l4 12 12 4-12 4-4 12-4-12-12-4 12-4 4-12Z" fill="#235ce0" />
        </svg>
        <div className="pb-caption"><span>{theme.label}</span><i>{theme.note}</i></div>
      </div>
      <div className="pb-bottom-rule"><span /> <span /> <span /></div>
    </div>
  )
}
