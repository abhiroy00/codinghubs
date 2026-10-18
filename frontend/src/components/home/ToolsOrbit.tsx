import { useEffect, useRef } from 'react'

const DV = 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/'
const TOOLS: [string, string, string, number][] = [
  ['Python', 'python/python-original.svg', '#FADCE5', -3],
  ['React', 'react/react-original.svg', '#FFD9D2', 2],
  ['Node.js', 'nodejs/nodejs-original.svg', '#CFEBE8', -1],
  ['TensorFlow', 'tensorflow/tensorflow-original.svg', '#DFE9CD', 4],
  ['AWS', 'amazonwebservices/amazonwebservices-plain-wordmark.svg', '#FFE4CE', -2],
  ['PyTorch', 'pytorch/pytorch-original.svg', '#F0E3D2', 3],
  ['GitHub', 'github/github-original.svg', '#F4F4F2', -4],
  ['Docker', 'docker/docker-original.svg', '#DCE1FB', 1],
  ['MongoDB', 'mongodb/mongodb-original.svg', '#E7E0F6', -3],
  ['JavaScript', 'javascript/javascript-original.svg', '#E7E7E7', 2],
  ['VS Code', 'vscode/vscode-original.svg', '#DCE1FB', -2],
  ['Figma', 'figma/figma-original.svg', '#FFD9D2', 4],
]

const PATH =
  "path('M1 269.434C58.5872 315.935 387.926 385.938 482.583 269.434C600.905 123.8051 525.516 16.7789 427.332 79.9613C329.149 143.1436 352.902 302.723 515.041 327.302C644.752 346.966 943.56 241.94 995 216.5')"

export function ToolsOrbit() {
  const hostRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current, area = areaRef.current, scaleEl = scaleRef.current
    if (!host || !area || !scaleEl) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

    type Row = [string, string, string, number, number, number]
    const all: Row[] = []
    TOOLS.forEach((t, i) => {
      all.push([...t, i / 24, i + 1])
      all.push([...t, i / 24 + 0.5, i + 11])
    })

    host.innerHTML = all
      .map(
        ([n, f, bg, rot, off, z]) =>
          `<div class="tool" data-off="${off}" style="offset-path:${PATH};animation:none;offset-distance:${(off * 100).toFixed(3)}%;z-index:${z}"><span class="block" style="display:block;transform:rotate(${rot}deg)"><span class="tile" title="${n}" style="background:${bg}"><img src="${DV + f}" alt="${n}" loading="lazy" draggable="false"></span></span></div>`,
      )
      .join('')

    const items = Array.from(host.querySelectorAll<HTMLElement>('.tool'))

    const fit = () => {
      const k = Math.min(area.clientWidth / 1060, area.clientHeight / 470)
      scaleEl.style.transform = `translate(-50%,-50%) scale(${k})`
    }
    fit()
    window.addEventListener('resize', fit)

    let cleanupInteractive = () => {}

    if (!CSS.supports('offset-path', "path('M0 0L1 1')")) {
      host.style.cssText = 'position:absolute;inset:0;display:flex;flex-wrap:wrap;gap:12px;justify-content:center;align-content:center'
      items.forEach((t, i) => {
        t.style.position = 'relative'
        if (i % 2) t.remove()
      })
    } else {
      let phase = 0
      let last = performance.now()
      let drag: { x: number; p: number } | null = null
      let visible = true
      let raf = 0

      const io = new IntersectionObserver((e) => {
        visible = e[0].isIntersecting
      })
      io.observe(area)

      const place = () =>
        items.forEach((t) => {
          const d = ((Number(t.dataset.off) + phase) % 1 + 1) % 1
          t.style.offsetDistance = (d * 100).toFixed(3) + '%'
        })

      const tick = (now: number) => {
        const dt = Math.min(now - last, 64)
        last = now
        if (!drag && visible && !reduce) phase += dt / 60000
        place()
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)

      const onDown = (e: PointerEvent) => {
        drag = { x: e.clientX, p: phase }
        area.setPointerCapture(e.pointerId)
        area.style.cursor = 'grabbing'
      }
      const onMove = (e: PointerEvent) => {
        if (drag) phase = drag.p - (e.clientX - drag.x) / (area.clientWidth * 1.4)
      }
      const onEnd = () => {
        drag = null
        area.style.cursor = ''
      }
      area.addEventListener('pointerdown', onDown)
      area.addEventListener('pointermove', onMove)
      area.addEventListener('pointerup', onEnd)
      area.addEventListener('pointercancel', onEnd)
      area.style.cursor = 'grab'
      area.style.touchAction = 'pan-y'

      cleanupInteractive = () => {
        cancelAnimationFrame(raf)
        io.disconnect()
        area.removeEventListener('pointerdown', onDown)
        area.removeEventListener('pointermove', onMove)
        area.removeEventListener('pointerup', onEnd)
        area.removeEventListener('pointercancel', onEnd)
      }
    }

    return () => {
      window.removeEventListener('resize', fit)
      cleanupInteractive()
    }
  }, [])

  return (
    <section className="tools" aria-label="Tools and technologies you will learn">
      <div className="container-x">
        <p className="rv center tiny-label" style={{ fontSize: '.6875rem' }}>
          The tools everyone is talking about
        </p>
      </div>
      <div className="path-area" ref={areaRef}>
        <div className="path-scale" ref={scaleRef}>
          <div ref={hostRef}></div>
        </div>
      </div>
      <div className="container-x">
        <p className="center" style={{ fontSize: '.8125rem', color: 'var(--color-muted)' }}>
          You have heard the names. Our classes show you how to build with them.
        </p>
      </div>
    </section>
  )
}
