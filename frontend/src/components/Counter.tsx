import { useEffect, useRef, useState } from 'react'

export function Counter({ to, suffix = '', color }: { to: number; suffix?: string; color?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [value, setValue] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setValue(to)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        io.unobserve(el)
        const t0 = performance.now()
        function tick(t: number) {
          const p = Math.min((t - t0) / 1400, 1)
          setValue(Math.round(to * (1 - Math.pow(1 - p, 4))))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [to])

  return (
    <p className="big" ref={ref} style={{ color }}>
      {value === null ? `${to}${suffix}` : `${value}${suffix}`}
    </p>
  )
}
