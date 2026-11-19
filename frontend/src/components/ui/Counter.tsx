import { useEffect, useRef, useState } from 'react'

export interface CounterProps {
  value: number
  /** Text after the number, e.g. "+" or "%". */
  suffix?: string
  /** Animation length in ms. */
  duration?: number
  className?: string
}

/** Counts up from 0 when scrolled into view. Server/no-JS/reduced-motion render the final value. */
export function Counter({ value, suffix = '', duration = 1600, className }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(value)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    setShown(0)
    let frame = 0
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      io.disconnect()
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        setShown(Math.round(value * (1 - Math.pow(1 - t, 3))))
        if (t < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(frame) }
  }, [value, duration])

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">{shown.toLocaleString('en-IN')}{suffix}</span>
      <span className="sr-only">{value.toLocaleString('en-IN')}{suffix}</span>
    </span>
  )
}
