import { ExpertCTA } from '../components/ExpertCTA'

export const FAQS = [
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
