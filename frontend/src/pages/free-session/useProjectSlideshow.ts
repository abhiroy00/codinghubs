import { useEffect, useRef, useState } from 'react'

/** Rotate only while visible; leave keyboard and reduced-motion users in control. */
export function useProjectSlideshow(count: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [environment, setEnvironment] = useState({ reduced: true, visible: false, inView: false })

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setEnvironment(current => ({ ...current, reduced: media.matches, visible: !document.hidden }))
    sync()
    media.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    const observer = new IntersectionObserver(entries => {
      setEnvironment(current => ({ ...current, inView: entries[0].isIntersecting }))
    }, { threshold: 0.2 })
    if (ref.current) observer.observe(ref.current)
    return () => {
      observer.disconnect()
      media.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  const running = environment.inView && environment.visible && !environment.reduced && !paused && !hovered && !focused
  useEffect(() => {
    if (!running) return
    const timer = window.setTimeout(() => setIndex(current => (current + 1) % count), 5000)
    return () => window.clearTimeout(timer)
  }, [running, index, count])

  function go(target: number) {
    setIndex(((target % count) + count) % count)
    setPaused(true)
  }

  function togglePlayback() {
    if (paused) setFocused(false)
    setPaused(current => !current)
  }

  return { ref, index, paused, running, reduced: environment.reduced, go, togglePlayback, setHovered, setFocused }
}
