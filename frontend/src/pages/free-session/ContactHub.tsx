import { AnimatedCard, Counter, Reveal, Section } from '../../components/ui'
import { COURSE_CATALOG } from '../../learning/catalog'
import { PROJECTS } from '../../data/projects'
import { AI_TOOLS } from '../../data/ai-tools'
import { useRegisterPopup } from '../../lib/register-popup'
import { INSTITUTE, WHATSAPP } from './data'
import { FsIcon } from './icons'
import './contact-hub.css'

/**
 * Visiting hours. Leave empty to show "visits by appointment" (the site's current guidance).
 * Example: [{ days: 'Mon – Sat', time: '10:00 AM – 7:00 PM' }, { days: 'Sunday', time: 'Closed' }]
 */
const TIMINGS: { days: string; time: string }[] = []

/**
 * Trust stats with count-up. The first four come from site data. Add real figures for students, batches
 * and placements here (e.g. { value: 1200, suffix: '+', label: 'Students trained' }); never estimates.
 */
const STATS: { value: number; suffix?: string; label: string }[] = [
  { value: COURSE_CATALOG.length, suffix: '+', label: 'Courses' },
  { value: PROJECTS.length, label: 'Portfolio projects' },
  { value: AI_TOOLS.length, label: 'AI tools taught' },
  { value: 2, suffix: ' hrs', label: 'Free live demo' },
]

const MAP_QUERY = encodeURIComponent(`Coding Hub School of AI, ${INSTITUTE.address}`)
const WA_HREF = `https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(WHATSAPP.genericMessage)}`

const SUPPORT = [
  { icon: 'i-wa', title: 'WhatsApp', text: 'Quick answers on courses, fees and batches', cta: 'Chat now', href: WA_HREF, tone: 'wa', external: true },
  { icon: 'i-phone', title: 'Call us', text: INSTITUTE.phone, cta: 'Call now', href: INSTITUTE.phoneHref, tone: 'call', external: false },
  { icon: 'i-mail', title: 'Email', text: INSTITUTE.email, cta: 'Send email', href: `mailto:${INSTITUTE.email}`, tone: 'mail', external: false },
] as const

/** Location map, support channels, timings, count-up trust stats and the closing CTA band. */
export function ContactHub() {
  const { open } = useRegisterPopup()
  return (
    <>
      <Section id="contact" titleId="ch-contact-title" className="chub wrap" tone="soft" badge="Visit or contact us" title={<>Talk to <span className="chub-grad">Coding Hub</span></>}
        subtitle="Visit our centre near Pitampura / Netaji Subhash Place, Delhi, or reach a counsellor on WhatsApp, phone or email.">
        <div className="chub-grid">
          <Reveal className="chub-map">
            <AnimatedCard as="div" className="chub-map-card" media={
              <iframe title="Coding Hub location on Google Maps" src={`https://www.google.com/maps?q=${MAP_QUERY}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            }>
              <div className="chub-map-row">
                <span className="chub-ico" aria-hidden="true"><FsIcon id="i-pin" /></span>
                <div>
                  <h3>Coding Hub School of AI</h3>
                  <p>{INSTITUTE.address}</p>
                </div>
              </div>
              <a className="ui-btn ui-btn-primary chub-dir" href={`https://www.google.com/maps/dir/?api=1&destination=${MAP_QUERY}`} target="_blank" rel="noopener noreferrer">
                Get Directions <FsIcon id="i-arrow" />
              </a>
            </AnimatedCard>
          </Reveal>

          <div className="chub-side">
            <Reveal as="ul" stagger className="chub-support" aria-label="Support channels">
              {SUPPORT.map((s) => (
                <li key={s.title}>
                  <AnimatedCard as="div" className={`chub-sup chub-sup-${s.tone}`}>
                    <span className="chub-ico" aria-hidden="true"><FsIcon id={s.icon} /></span>
                    <div className="chub-sup-text">
                      <h3><a href={s.href} {...(s.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{s.title}</a></h3>
                      <p>{s.text}</p>
                    </div>
                    <span className="chub-sup-cta" aria-hidden="true">{s.cta} →</span>
                  </AnimatedCard>
                </li>
              ))}
            </Reveal>

            <Reveal>
              <AnimatedCard as="div" className="chub-time">
                <span className="chub-ico" aria-hidden="true"><FsIcon id="i-clock" /></span>
                <div>
                  <h3>Timings</h3>
                  {TIMINGS.length ? (
                    <dl>{TIMINGS.map((t) => <div key={t.days}><dt>{t.days}</dt><dd>{t.time}</dd></div>)}</dl>
                  ) : (
                    <p>Centre visits by appointment. Please call before you come so a counsellor is available. Live online classes run on scheduled batch timings.</p>
                  )}
                </div>
              </AnimatedCard>
            </Reveal>

            <ul className="chub-social" aria-label="Coding Hub on social media">
              {([['instagram', 'i-ig', 'Instagram'], ['linkedin', 'i-in', 'LinkedIn'], ['youtube', 'i-yt', 'YouTube'], ['facebook', 'i-fb', 'Facebook']] as const).map(([k, icon, label]) => (
                <li key={k}><a href={INSTITUTE.social[k]} target="_blank" rel="noopener noreferrer"><FsIcon id={icon} /><span className="sr-only">{label}</span></a></li>
              ))}
            </ul>
          </div>
        </div>

        <Reveal as="dl" stagger className="chub-stats" aria-label="Coding Hub at a glance">
          {STATS.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd><Counter value={s.value} suffix={s.suffix} /></dd>
            </div>
          ))}
        </Reveal>
      </Section>

      <section className="wrap chub-band-wrap" aria-labelledby="chub-band-title">
        <div className="chub-band">
          <span className="chub-band-blob" aria-hidden="true" />
          <Reveal className="chub-band-copy">
            <p className="ui-badge chub-band-badge"><span aria-hidden="true" />Admissions open</p>
            <h2 id="chub-band-title">Start Your AI Career with Coding Hub</h2>
            <p>Join a free 2-hour live demo, meet a mentor and get a personalised learning plan for AI, Data Science or GenAI.</p>
            <div className="chub-band-actions ui-on-dark">
              <button type="button" className="ui-btn ui-btn-primary" aria-haspopup="dialog" onClick={() => open()}>Book Free Demo <FsIcon id="i-arrow" /></button>
              <a className="ui-btn ui-btn-ghost" href={WA_HREF} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>
            </div>
          </Reveal>
          <img className="chub-band-img" src="/img/students-1000.webp" srcSet="/img/students-720.webp 720w, /img/students-1000.webp 1000w, /img/students.webp 1400w" sizes="(max-width: 900px) 92vw, 620px" alt="" width={1400} height={665} loading="lazy" decoding="async" />
        </div>
      </section>
    </>
  )
}
