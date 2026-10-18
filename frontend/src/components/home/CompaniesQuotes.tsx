import { useEffect, useRef, useState } from 'react'

const COMPANIES: [string, string][] = [
  ['Google', 'google.com'], ['Microsoft', 'microsoft.com'], ['NVIDIA', 'nvidia.com'], ['Amazon', 'amazon.com'],
  ['Meta', 'meta.com'], ['Apple', 'apple.com'], ['OpenAI', 'openai.com'], ['Adobe', 'adobe.com'],
  ['Salesforce', 'salesforce.com'], ['IBM', 'ibm.com'], ['Infosys', 'infosys.com'], ['TCS', 'tcs.com'],
  ['Accenture', 'accenture.com'], ['Wipro', 'wipro.com'], ['Deloitte', 'deloitte.com'],
]

const QUOTES = [
  {
    t: 'AI is one of the most important things humanity is working on. It is more profound than, I dunno, electricity or fire.',
    n: 'Sundar Pichai', r: 'CEO, Google and Alphabet', m: 'Speaking at a town hall event, 2018',
    src: ['CNBC', 'https://www.cnbc.com/2018/02/01/google-ceo-sundar-pichai-ai-is-more-important-than-fire-electricity.html'] as [string, string],
    c: 'linear-gradient(140deg,#4285F4,#34A853)',
  },
  {
    t: 'You’re not going to lose your job to an AI, but you’re going to lose your job to somebody who uses AI.',
    n: 'Jensen Huang', r: 'Founder and CEO, NVIDIA', m: 'Milken Institute Global Conference, 2025',
    c: 'linear-gradient(140deg,#76B900,#3f6b00)',
  },
  {
    t: 'AI is the new electricity.',
    n: 'Andrew Ng', r: 'Founder, DeepLearning.AI', m: 'Stanford Graduate School of Business, 2017',
    c: 'linear-gradient(140deg,#4f46e5,#7c6cf0)',
  },
]

const fav = (d: string) => `https://www.google.com/s2/favicons?domain=${d}&sz=128`
const initials = (n: string) => n.split(' ').map((s) => s[0]).join('').slice(0, 2)

export function CompaniesQuotes() {
  const [qi, setQi] = useState(0)
  const [out, setOut] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  function show(i: number, animate = true) {
    if (animate) {
      setOut(true)
      setTimeout(() => {
        setQi(i)
        setOut(false)
      }, 300)
    } else {
      setQi(i)
    }
  }

  function startAuto() {
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(() => show((qi + 1) % QUOTES.length), 7000)
  }

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduce) startAuto()
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi])

  const q = QUOTES[qi]

  return (
    <section className="section bg-2" id="placements" aria-labelledby="companies-heading">
      <div className="container-x">
        <div className="narrow center">
          <p className="eyebrow rv">Who is taking this seriously</p>
          <h2 id="companies-heading" className="display-lg mt-4">
            <span className="line-mask">
              <span>The world’s biggest companies are betting on AI.</span>
            </span>
          </h2>
        </div>
      </div>
      <div className="container-x mt-14">
        <ul className="co-list">
          {COMPANIES.map(([name, domain]) => (
            <li className="rv-pop" key={name}>
              <span className="co-tile">
                <img
                  src={fav(domain)}
                  alt={name}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.outerHTML = `<span class=mono>${name.slice(0, 2)}</span>`
                  }}
                />
              </span>
              <span className="nm">{name}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="container-x mt-14">
        <div className="narrow center">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="var(--color-brand)" style={{ marginInline: 'auto', opacity: 0.85 }} aria-hidden="true">
            <path d="M7.2 17.5c-1.6 0-2.9-1.3-2.9-3.3 0-3.3 2.4-6.4 5.5-7.7l.7 1.1c-1.9 1-3.1 2.6-3.3 4.1.3-.1.6-.2 1-.2 1.6 0 2.8 1.2 2.8 2.9 0 1.8-1.5 3.1-3.8 3.1Zm9.1 0c-1.6 0-2.9-1.3-2.9-3.3 0-3.3 2.4-6.4 5.5-7.7l.7 1.1c-1.9 1-3.1 2.6-3.3 4.1.3-.1.6-.2 1-.2 1.6 0 2.8 1.2 2.8 2.9 0 1.8-1.5 3.1-3.8 3.1Z" />
          </svg>
          <div className="quote-box mt-6" aria-live="polite">
            <figure className={`quote${out ? ' out' : ''}`}>
              <blockquote>{q.t}</blockquote>
              <figcaption>
                <span className="avatar av-ring" style={{ width: 56, height: 56, fontSize: '1.05rem', background: q.c }}>
                  {initials(q.n)}
                </span>
                <span>
                  <span style={{ display: 'block', fontSize: '.9375rem', fontWeight: 600 }}>{q.n}</span>
                  <span style={{ display: 'block', fontSize: '.875rem', color: 'var(--color-muted)' }}>{q.r}</span>
                  <span style={{ display: 'block', marginTop: '.25rem', fontSize: '.75rem', color: 'var(--color-faint)' }}>
                    {q.m}
                    {q.src && (
                      <>
                        {' · '}
                        <a href={q.src[1]} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                          {q.src[0]}
                        </a>
                      </>
                    )}
                  </span>
                </span>
              </figcaption>
            </figure>
          </div>
          <div className="q-dots">
            {QUOTES.map((quote, i) => (
              <button
                key={quote.n}
                type="button"
                aria-label={`Show the quote from ${quote.n}`}
                aria-current={i === qi}
                onClick={() => {
                  show(i)
                  startAuto()
                }}
              >
                <span className="avatar" style={{ width: i === qi ? 40 : 34, height: i === qi ? 40 : 34, background: quote.c, fontSize: '.75rem' }}>
                  {initials(quote.n)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
