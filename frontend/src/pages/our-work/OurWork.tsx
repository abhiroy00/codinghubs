import { useMemo, useState } from 'react'
import { PageFrame } from '../../content-pages/shared'
import { LOGO_URL, organizationNode, pageSeo, type PageMeta } from '../../seo/site'
import { useSeo } from '../../seo/useSeo'
import './our-work.css'
import { HeroVideo } from '../../components/HeroVideo'
import { AnimatedCard, Reveal, Section } from '../../components/ui'
import { PROJECTS as WORKS, PROJECT_CATEGORIES as CATEGORIES, type Project as Work } from '../../data/projects'


export const OUR_WORK_META: PageMeta = {
  path: '/our-work',
  title: 'Our Work: AI Apps, Platforms and Websites | Coding Hubs',
  description: 'Explore projects we have built and shipped: AI applications, business platforms, online stores and websites, with screenshots and live links.',
  image: LOGO_URL,
  indexable: true,
  jsonLd: {
    '@context': 'https://schema.org',
    '@graph': [
      organizationNode(),
      {
        '@type': 'CollectionPage',
        name: 'Our Work',
        url: 'https://codinghubs.in/our-work',
        hasPart: WORKS.map((w) => ({ '@type': 'CreativeWork', name: w.name, genre: w.category, description: w.summary, ...(w.href ? { url: w.href } : {}) })),
      },
    ],
  },
}
const OUR_WORK_SEO = pageSeo(OUR_WORK_META)

function ArrowUpRight() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  )
}

function WorkCard({ w, i }: { w: Work; i: number }) {
  return (
    <li className="ow-item">
      <AnimatedCard className="ow-card" media={
        <img src={`/assets/our-work/${w.image}.webp`} alt={`${w.name} screenshot`} width={800} height={500} loading={i < 3 ? 'eager' : 'lazy'} decoding="async" />
      }>
        <h3 className="ow-brand"><span aria-hidden="true" />{w.name}</h3>
        <ul className="ow-chips-row" aria-label="Category and tech stack">
          <li className="ow-cat">{w.category}</li>
          {w.stack?.map((t) => <li key={t} className="ui-chip ow-tech">{t}</li>)}
        </ul>
        <p className="ow-sum">{w.summary}</p>
        {w.href ? (
          <a className="ui-btn ui-btn-primary ow-view" href={w.href} target="_blank" rel="noopener noreferrer" aria-label={`View project ${w.name} (opens in a new tab)`}>
            View Project <ArrowUpRight />
          </a>
        ) : (
          <p className="ow-private">Private client project</p>
        )}
      </AnimatedCard>
    </li>
  )
}

export function OurWork() {
  const [category, setCategory] = useState('')
  const shown = useMemo(() => (category ? WORKS.filter((w) => w.category === category) : WORKS), [category])

  useSeo(OUR_WORK_SEO)

  return (
    <PageFrame wide>
      <section className="ow-hero hv-host"><HeroVideo clip="our-work" />
        <p className="ow-eyebrow">Projects</p>
        <h1>Projects built, shipped and <span>working in the real world</span></h1>
        <p className="ow-lead">AI applications, business platforms, online stores and websites. Open a project to see it live.</p>
        <ul className="ow-stats" aria-label="Portfolio at a glance">
          <li><strong>{WORKS.length}</strong><span>Projects</span></li>
          <li><strong>{CATEGORIES.length}</strong><span>Disciplines</span></li>
          <li><strong>{WORKS.filter((w) => w.href).length}</strong><span>Live links</span></li>
        </ul>
      </section>

      <div className="ow-chips" role="group" aria-label="Filter by discipline">
        <button type="button" className={!category ? 'on' : ''} aria-pressed={!category} onClick={() => setCategory('')}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c} type="button" className={category === c ? 'on' : ''} aria-pressed={category === c} onClick={() => setCategory(category === c ? '' : c)}>
            {c}
          </button>
        ))}
      </div>

      <Reveal as="ul" stagger className="ow-grid" key={category} aria-label="Projects">
        {shown.map((w, i) => (
          <WorkCard key={w.name} w={w} i={i} />
        ))}
      </Reveal>

      <p className="ow-note">Screens show each project at delivery. Live websites may have changed since.</p>

      <Section id="ow-cta" className="ow-cta" tone="dark" align="left" badge="Learn by building" title="Want to build projects like these?"
        subtitle="Join the free 2-hour live session at Coding Hub and see how we plan, build and ship real software."
        aside={<a className="ui-btn ui-btn-primary" href="/#register">Join free demo <ArrowUpRight /></a>} />
    </PageFrame>
  )
}
