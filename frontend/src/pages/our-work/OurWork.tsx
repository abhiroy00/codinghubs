import { useMemo, useState } from 'react'
import { PageFrame } from '../../content-pages/shared'
import { LOGO_URL, organizationNode, pageSeo, type PageMeta } from '../../seo/site'
import { useSeo } from '../../seo/useSeo'
import './our-work.css'
import { HeroVideo } from '../../components/HeroVideo'

type Work = {
  name: string
  category: string
  summary: string
  image: string
  /** Live site or case study; cards without one are not links. */
  href?: string
}

const SITE = 'https://innovativeais.com'

const WORKS: Work[] = [
  {
    name: 'LeadGenPlus.ai',
    category: 'AI Applications',
    summary: 'AI sales engagement platform with a dialer, lead database, call sequences, recordings and an operations dashboard.',
    image: 'leadgenplus-leads-search',
    href: `${SITE}/others/portfolio-leadgenplus.php`,
  },
  {
    name: 'Properly',
    category: 'PropTech',
    summary: 'Property investment platform: a marketing site plus an investor dashboard for loans, income, equity and more.',
    image: 'investview-au',
    href: 'https://investview.com.au/',
  },
  {
    name: 'Shivlal Manpower',
    category: 'HR & Workforce',
    summary: 'Workforce admin console for a manpower agency covering attendance, payroll, PF/ESI, recruitment and leave.',
    image: 'shivlal2',
    href: `${SITE}/others/portfolio-shivlal-manpower.php`,
  },
  {
    name: 'Mimi Learning',
    category: 'AI Applications',
    summary: 'A playful AI learning platform for children, built around engaging activities.',
    image: 'mimiplay-in',
    href: 'https://mimiplay.in/',
  },
  {
    name: 'Innovative AI Labs',
    category: 'Web Development',
    summary: 'Engineering brand website for AI agents, RAG, LLM integration and automation, with a callback lead form.',
    image: 'innovativeaislabs',
    href: 'https://innovativeaislabs.com/',
  },
  {
    name: 'Coding Hub',
    category: 'Web Development',
    summary: 'Coding education website showcasing courses, instructors and student testimonials.',
    image: 'codingnowai-in',
    href: 'https://codingnowai.in/',
  },
  {
    name: 'Designhubs',
    category: 'Web Development',
    summary: 'Creative design studio website presenting its services, work and partners.',
    image: 'designhubs-in',
    href: 'https://designhubs.in/',
  },
  {
    name: 'Loan Mitra',
    category: 'Web Development',
    summary: 'Loan and insurance comparison site with eligibility forms, a free CIBIL check, an EMI calculator and a product catalogue.',
    image: 'loan-mitra',
  },
  {
    name: 'Agarwal Travels',
    category: 'Web Development',
    summary: 'Travel agency website for a Mumbai desk with destination sliders, popular routes and click-to-call booking.',
    image: 'agarwal-travels',
  },
  {
    name: 'RL Secure Home',
    category: 'Web Development',
    summary: 'Website for a safety grill, bird net and hanger installer with product highlights and call/WhatsApp lead capture.',
    image: 'rl-secure-home',
  },
  {
    name: 'Gmart Fresh',
    category: 'E-Commerce',
    summary: 'Grocery delivery platform with category browsing, product badges and an admin dashboard for orders, inventory and analytics.',
    image: 'shop-gmartfresh',
    href: 'https://shop.gmartfresh.com/',
  },
  {
    name: 'Sportswear9',
    category: 'E-Commerce',
    summary: 'Online store for sports and activewear with product listings, reviews and a smooth checkout flow.',
    image: 'sportswear',
    href: `${SITE}/others/portfolio-sportswear9.php`,
  },
  {
    name: 'AI Exam System',
    category: 'AI Applications',
    summary: 'Online examination platform with an admin dashboard for question banks, faculty, courses, evaluation and users.',
    image: 'ai-exam-system',
  },
  {
    name: 'RDPMS',
    category: 'Web Applications',
    summary: 'Secure portal for a remote diagnostics and predictive maintenance system.',
    image: 'rdpms',
    href: `${SITE}/others/portfolio-rdpms.php`,
  },
]

const CATEGORIES = [...new Set(WORKS.map((w) => w.category))]

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
  const body = (
    <>
      <div className="ow-shot">
        <img src={`/assets/our-work/${w.image}.webp`} alt={`${w.name} screenshot`} width={800} height={500} loading={i < 3 ? 'eager' : 'lazy'} decoding="async" />
      </div>
      <div className="ow-body">
        <p className="ow-brand"><span aria-hidden="true" />{w.name}</p>
        <p className="ow-cat">{w.category}</p>
        <p className="ow-sum">{w.summary}</p>
        <p className="ow-go">
          {w.href ? <>View project <ArrowUpRight /></> : 'Private client project'}
        </p>
      </div>
    </>
  )
  return (
    <li className="ow-item" style={{ ['--i' as string]: Math.min(i, 8) }}>
      {w.href ? (
        <a className="ow-card" href={w.href} target="_blank" rel="noopener noreferrer" aria-label={`${w.name}, ${w.category} (opens in a new tab)`}>
          {body}
        </a>
      ) : (
        <div className="ow-card is-static">{body}</div>
      )}
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

      <ul className="ow-grid" key={category} aria-label="Projects">
        {shown.map((w, i) => (
          <WorkCard key={w.name} w={w} i={i} />
        ))}
      </ul>

      <p className="ow-note">Screens show each project at delivery. Live websites may have changed since.</p>

      <section className="ow-cta">
        <div>
          <h2>Want to build projects like these?</h2>
          <p>Join the free 2-hour live session and see how we plan, build and ship real software.</p>
        </div>
        <a className="btn btn-yellow btn-lg" href="/#register">Join free demo</a>
      </section>
    </PageFrame>
  )
}
