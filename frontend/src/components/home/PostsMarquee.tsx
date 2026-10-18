import type { CSSProperties } from 'react'

const POSTS = [
  'Campus Connect at <b>Bharati Vidyapeeth</b> 🎓 Live workshop, hands-on labs and a placement talk with our mentors. Next stop: MSIT. <span class="ht">#CampusConnect</span>',
  'New on the blog: <b>GitHub Portfolio for Freshers</b> — showcase your coding skills without experience. 👇',
  '3200+ students placed. Highest package <b>₹34 LPA</b>. Admissions are open for the next job-ready batch in Delhi NCR. 🚀',
  'From UPI to AI Agents: <b>what’s next for digital payments in India?</b> UPI just turned ten. Here’s the next chapter.',
  'This month’s Campus Connect drives: <b>VIPS, JIMS, Tecnia &amp; MERI College</b>. Real projects, real mentors. <span class="ht">#CampusConnect</span>',
  'Can someone hack you through public Wi-Fi? Our cyber security mentors break it down. 🔐 <span class="ht">#CyberSecurity</span>',
]

const XL = '<svg class="xlogo" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.2 2.3h3.3l-7.2 8.3 8.5 11.2h-6.7l-5.2-6.8-6 6.8H1.6l7.7-8.8L1.2 2.3h6.8l4.7 6.2 5.5-6.2Zm-1.2 17.5h1.8L7.1 4.2H5.1l11.9 15.6Z"/></svg>'
const TICK =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-label="Verified"><path d="M22.5 12.5c0-1.6-.9-2.9-2.2-3.6.5-1.4.2-3.1-.9-4.2s-2.8-1.4-4.2-.9C14.5 2.5 13.2 1.5 11.6 1.5s-2.9 1-3.6 2.3c-1.4-.5-3.1-.2-4.2.9s-1.4 2.8-.9 4.2C1.6 9.6.6 10.9.6 12.5s1 2.9 2.3 3.6c-.5 1.4-.2 3.1.9 4.2s2.8 1.4 4.2.9c.7 1.3 2 2.3 3.6 2.3s2.9-1 3.6-2.3c1.4.5 3.1.2 4.2-.9s1.4-2.8.9-4.2c1.3-.7 2.2-2 2.2-3.6Zm-12.3 4.6-4-4 1.4-1.4 2.6 2.6 5.8-5.8 1.4 1.4-7.2 7.2Z"/></svg>'

const post = (t: string) =>
  `<span class="mq-item"><a class="xpost" href="#"><div class="xin"><div class="hd"><span class="avatar" style="background:#111218;color:var(--color-lime)">CH</span><div class="xwho"><b>Coding Hubs School of AI ${TICK}</b><span>@CodingHubsAI · Delhi NCR</span></div>${XL}</div><p class="tx">${t}</p></div></a></span>`

const group = (h: string, hidden?: boolean) => `<div class="marquee-group"${hidden ? ' aria-hidden="true"' : ''}>${h}</div>`

const trackA = POSTS.slice(0, 3).map(post).join('')
const trackB = POSTS.slice(3).map(post).join('')

export function PostsMarquee() {
  return (
    <section className="section" aria-labelledby="tweets-heading">
      <div className="container-x">
        <div className="narrow center">
          <p className="eyebrow rv">Straight from the source</p>
          <h2 id="tweets-heading" className="display-lg mt-4">
            <span className="line-mask">
              <span>Our students are not being subtle.</span>
            </span>
          </h2>
        </div>
      </div>
      <div className="mt-12" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="marquee mask-fade-x" style={{ '--dur': '62s' } as CSSProperties}>
          <div className="marquee-track" dangerouslySetInnerHTML={{ __html: group(trackA) + group(trackA, true) }} />
        </div>
        <div className="marquee mask-fade-x" style={{ '--dur': '74s', '--dir': 'reverse' } as CSSProperties}>
          <div className="marquee-track" dangerouslySetInnerHTML={{ __html: group(trackB) + group(trackB, true) }} />
        </div>
      </div>
    </section>
  )
}
