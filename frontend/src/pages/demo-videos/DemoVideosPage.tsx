import { PageFrame } from '../../content-pages/shared'
import { DemoVideos } from '../../components/DemoVideos'
import { HeroVideo } from '../../components/HeroVideo'
import { Section } from '../../components/ui'
import { DEMO_CHANNEL_URL, DEMO_VIDEOS } from '../../data/demoVideos'
import { LOGO_URL, organizationNode, pageSeo, type PageMeta } from '../../seo/site'
import { useSeo } from '../../seo/useSeo'
import { VIDEOS } from '../free-session/data'
import { VideoReels } from '../free-session/VideoReels'
import '../free-session/home-theme.css'
import './demo-videos-page.css'

export const DEMO_VIDEOS_META: PageMeta = {
  path: '/demo-videos',
  title: 'Free Demo Classes & Video Lessons | Coding Hub',
  description: 'Watch free Coding Hub demo classes and Hindi video lessons on SQL, Python, HTML and CSS before you join a live course in Delhi.',
  image: LOGO_URL,
  indexable: true,
  jsonLd: {
    '@context': 'https://schema.org',
    '@graph': [
      organizationNode(),
      {
        '@type': 'CollectionPage',
        name: 'Coding Hub demo classes',
        url: 'https://codinghubs.in/demo-videos',
        sameAs: DEMO_CHANNEL_URL,
        hasPart: DEMO_VIDEOS.map((v) => ({ '@type': 'VideoObject', name: v.course, url: v.youtubeUrl })),
      },
    ],
  },
}
const DEMO_VIDEOS_SEO = pageSeo(DEMO_VIDEOS_META)

/** /demo-videos: the classroom demo reels and the Coding Hub YouTube lessons, moved off the homepage. */
export function DemoVideosPage() {
  useSeo(DEMO_VIDEOS_SEO)
  return (
    <PageFrame wide>
      <section className="bl-hero hv-host"><HeroVideo clip="learn" />
        <span className="bl-blob b1" aria-hidden="true" />
        <span className="bl-blob b2" aria-hidden="true" />
        <div className="bl-hero-in">
          <p className="bl-eyebrow">Free · No sign-up</p>
          <h1>Watch Our Free <span>Demo Classes</span></h1>
          <p className="bl-lead">See how Coding Hub teaches before you join: short classroom demos from our trainers and full Hindi lessons from our YouTube channel.</p>
        </div>
      </section>

      <div className="ch-home dvp">
        <Section id="classroom-demos" align="center" badge="Classroom demos" title={<>Short demos from <span className="dvp-grad">our trainers</span></>}
          subtitle={<><strong>{VIDEOS.length}</strong> short videos. Tap any video to watch, no sign-up needed.</>}>
          <VideoReels />
        </Section>

        <Section id="youtube-classes" tone="soft" align="center" badge="YouTube lessons" title={<>Learn free on <span className="dvp-grad">YouTube</span></>}
          subtitle="SQL, Python, HTML and CSS lessons in Hindi. Videos move four at a time; hover to pause or use the arrows.">
          <DemoVideos />
        </Section>

      </div>
    </PageFrame>
  )
}
