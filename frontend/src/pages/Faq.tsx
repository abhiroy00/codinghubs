import { useRef } from 'react'
import { ExpertCTA } from '../components/ExpertCTA'
import { useReveal } from '../hooks/useReveal'

const FAQS = [
  { q: 'Do you provide placement support?', a: 'Yes. We provide 100% placement assistance, including resume building, mock interviews, portfolio preparation and job referrals.', open: true },
  { q: 'Are classes live or recorded?', a: 'Classes are live and interactive with mentors, and sessions are also recorded so you can revise anytime.' },
  { q: 'Can beginners join AI & Full Stack courses?', a: 'Absolutely. Our courses are beginner-friendly and designed step by step, from the basics to an advanced level.' },
  { q: 'Will I work on real projects?', a: 'Yes. Students build real-world projects and industry-level applications to gain practical experience.' },
  { q: 'What is the course duration?', a: 'It depends on the program. Most programs run between 3 and 9 months, with flexible learning schedules.' },
  { q: 'Is the demo class really free?', a: 'Yes — the demo class is completely free, with no commitment. Book it from any “Free Demo Class” button and our counsellor will confirm your slot.' },
  { q: 'Where are your centres?', a: 'Our head office is at 904, 9th Floor, Pearls Best Heights-I, Netaji Subhash Place, Delhi – 110034. We serve students across Pitampura, Rohini, Ashok Vihar, Shalimar Bagh, Model Town, Paschim Vihar and nearby areas.' },
]

const TEAM = [
  {
    initials: 'AK', bg: 'linear-gradient(140deg,#4f46e5,#7c6cf0)', role: 'Founder & Director', name: 'Abhishek Kumar',
    bio: 'Founder of Coding Hubs School of AI, passionate about transforming education through real-world learning. With strong expertise in AI, Data Science and Full Stack Development, he has trained thousands of students and helped them build successful careers.',
    ticks: ['5+ years industry experience', 'AI & Full Stack expert', '3200+ students trained'],
  },
  {
    initials: 'SS', bg: 'linear-gradient(140deg,#0ea5a4,#14b8a6)', role: 'Academic Director', name: 'Sandeep Sharma',
    bio: 'Academic leader focused on delivering a structured, industry-aligned curriculum. Specialises in mentoring students with hands-on projects, interview preparation and career guidance to ensure real placement success.',
    ticks: ['7+ years teaching experience', 'Career mentorship expert', 'Placement strategy specialist'],
  },
]

export function Faq() {
  const ref = useRef<HTMLDivElement>(null)
  useReveal(ref)

  return (
    <div ref={ref}>
      <section className="page-hero" aria-labelledby="faq-heading">
        <div aria-hidden="true" style={{ pointerEvents: 'none', position: 'absolute', inset: 0, zIndex: -1 }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to bottom,#d2e8f9 0%,#e9f4fd 40%,#f6fbfe 70%,var(--color-bg) 100%)' }}></div>
        </div>
        <div className="container-x">
          <div className="narrow center">
            <p className="eyebrow rv">FAQ</p>
            <h1 id="faq-heading" className="display-lg mt-4">
              <span className="line-mask">
                <span>Everything you need to know.</span>
              </span>
            </h1>
            <p className="lede rv mt-5" style={{ maxWidth: '36rem', marginInline: 'auto' }}>
              Can’t find your answer? Talk to an expert — we will call you back.
            </p>
          </div>
          <div className="faq rv">
            {FAQS.map((item) => (
              <details key={item.q} open={item.open}>
                <summary>
                  {item.q}
                  <span className="pm" aria-hidden="true"></span>
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-2" id="team" aria-labelledby="team-heading">
        <div className="container-x">
          <div className="narrow center">
            <p className="eyebrow rv">Leadership</p>
            <h2 id="team-heading" className="display-lg mt-4">
              <span className="line-mask">
                <span>Mentors who’ve done it.</span>
              </span>
            </h2>
            <p className="lede rv mt-5" style={{ maxWidth: '42rem', marginInline: 'auto' }}>
              In partnership with Innovative AI Solutions — where traditional mentorship meets modern technology.
            </p>
          </div>
          <div className="team">
            {TEAM.map((member) => (
              <article className="tcard rv-up" key={member.name}>
                <div className="hd">
                  <span className="avatar" style={{ background: member.bg }}>
                    {member.initials}
                  </span>
                  <div>
                    <p className="role">{member.role}</p>
                    <h3>{member.name}</h3>
                  </div>
                </div>
                <p className="b">{member.bio}</p>
                <ul className="ticks">
                  {member.ticks.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ExpertCTA />
    </div>
  )
}
