import { ExpertCTA } from '../components/ExpertCTA'
import { LOGO_URL, organizationNode, pageSeo, type PageMeta } from '../seo/site'
import { useSeo } from '../seo/useSeo'

import { FAQS } from './faq-data'
export { FAQS }

export const FAQ_META: PageMeta = {
  path: '/faq', title: 'Frequently asked questions | Coding Hubs',
  description: 'Answers about Coding Hubs programs, learning options, enrollment and support.',
  image: LOGO_URL, indexable: true,
  jsonLd: { '@context': 'https://schema.org', '@graph': [organizationNode(), {
    '@type': 'FAQPage', name: 'Coding Hubs frequently asked questions', url: 'https://codinghubs.in/faq',
    mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }] },
}
const FAQ_SEO = pageSeo(FAQ_META)

const TEAM = [
  {
    initials: 'AK', role: 'Founder & Director', name: 'Abhishek Kumar',
    bio: 'Founder of Coding Hubs School of AI, passionate about transforming education through real-world learning. With strong expertise in AI, Data Science and Full Stack Development, he has trained thousands of students and helped them build successful careers.',
    ticks: ['5+ years industry experience', 'AI & Full Stack expert', '3200+ students trained'],
  },
  {
    initials: 'SS', role: 'Academic Director', name: 'Sandeep Sharma',
    bio: 'Academic leader focused on delivering a structured, industry-aligned curriculum. Specialises in mentoring students with hands-on projects, interview preparation and career guidance to ensure real placement success.',
    ticks: ['7+ years teaching experience', 'Career mentorship expert', 'Placement strategy specialist'],
  },
]

export function Faq() {
  useSeo(FAQ_SEO)
  return (
    <div className="learn-shell">
      <section className="learn-hero" aria-labelledby="faq-heading">
        <p className="learn-kicker">FAQ</p>
        <h1 id="faq-heading">Everything you need to know.</h1>
        <p>Can’t find your answer? Talk to an expert — we will call you back.</p>
      </section>

      <section className="learn-section" aria-label="Frequently asked questions">
        {FAQS.map((item) => (
          <details key={item.q} className="learn-faq" open={item.open}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </section>

      <section className="learn-section" id="team" aria-labelledby="team-heading">
        <h2 id="team-heading">Mentors who’ve done it.</h2>
        <p className="learn-muted">In partnership with Innovative AI Solutions — where traditional mentorship meets modern technology.</p>
        <div className="learn-project-grid">
          {TEAM.map((member) => (
            <article key={member.name}>
              <p className="learn-kicker">{member.initials} · {member.role}</p>
              <h3>{member.name}</h3>
              <p>{member.bio}</p>
              <ul className="lesson-list">
                {member.ticks.map((tick) => (
                  <li key={tick}>{tick}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <ExpertCTA />
    </div>
  )
}
