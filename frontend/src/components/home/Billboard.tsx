import { useEffect, useState } from 'react'

const SLIDES = [
  { h: 'Chai or code?', s: 'Why not both? ☕' },
  { h: 'Your resume called.', s: 'It wants a live project. 📁' },
  { h: 'console.log("hired")', s: '3200+ students already ran it. ✅' },
  { h: 'Don’t fear AI.', s: 'Build with it. 🤖' },
  { h: '₹34 LPA.', s: 'Highest package. Not a typo. 💼' },
  { h: 'Netflix tonight?', s: 'Or a React app that ships. 🍿' },
  { h: 'Zero to job-ready.', s: 'With mentors who’ve done it. 🚀' },
]

export function Billboard() {
  const [i, setI] = useState(0)

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const t = setInterval(() => setI((prev) => (prev + 1) % SLIDES.length), 3200)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="bb-wrap">
      <div className="bb-tilt">
        <figure className="billboard" id="billboard">
          <figcaption className="sr-only">Billboard advertisement</figcaption>
          <span className="glass" aria-hidden="true"></span>
          <span className="glint" aria-hidden="true"></span>
          <div className="bb-in">
            <div className="bb-top">
              <span className="live">
                <i></i>Now showing
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ color: 'var(--color-line-strong)' }}>/{String(SLIDES.length).padStart(2, '0')}</span>
              </span>
            </div>
            <div className="bb-stage">
              {SLIDES.map((slide, idx) => (
                <div className={`bb-slide${idx === i ? ' on' : ''}`} key={slide.h}>
                  <p className="h">{slide.h}</p>
                  <p className="s">{slide.s}</p>
                </div>
              ))}
            </div>
            <div className="bb-foot">
              <span className="logo-text" style={{ fontSize: '.9375rem' }}>
                CodingHubs<b>AI</b>
              </span>
              <span className="t">
                Free Demo Class<span style={{ marginLeft: '.25rem', color: 'var(--color-lime-deep)' }}>→</span>
              </span>
            </div>
          </div>
        </figure>
        <div className="bb-legs" aria-hidden="true">
          <span className="bar"></span>
          <span className="leg" style={{ left: '24%' }}></span>
          <span className="leg" style={{ right: '24%' }}></span>
        </div>
      </div>
      <div className="bb-shadow" aria-hidden="true"></div>
      <p className="sr-only">A free live demo class from Coding Hubs School of AI, Monday to Saturday.</p>
    </div>
  )
}
