import { useEffect, useRef, useState } from 'react'

const VIDEO = '/assets/showreel/project-showreel.mp4'
const POSTER = '/assets/showreel/project-showreel-poster.webp'

/** The supplied showreel loads when visible, with native controls and silent autoplay. */
export function ProjectShowreel() {
  const container = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const userPaused = useRef(false)
  const automaticPause = useRef(false)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [environment, setEnvironment] = useState({ inView: false, reduced: true, visible: true })

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setEnvironment(current => ({ ...current, reduced: media.matches, visible: !document.hidden }))
    sync()
    if (videoRef.current) videoRef.current.muted = true
    media.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    const onVisibility = (inView: boolean) => {
      setEnvironment(current => ({ ...current, inView }))
      if (inView) setLoaded(true)
    }
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => onVisibility(entry.isIntersecting), { threshold: 0.2 })
      : null
    if (observer && container.current) observer.observe(container.current)
    else onVisibility(true)
    return () => {
      observer?.disconnect()
      media.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || failed) return
    if (!environment.inView || !environment.visible || environment.reduced) {
      if (!video.paused) {
        automaticPause.current = true
        video.pause()
      }
      return
    }
    if (loaded && !userPaused.current) void video.play().catch(() => undefined)
  }, [environment.inView, environment.visible, environment.reduced, loaded, failed])

  return (
    <div className="hp-media" ref={container}>
      <div className="hp-video-frame">
        {failed ? <>
          <img src={POSTER} alt="Project showreel preview" width={1280} height={720} />
          <p className="hp-video-error" role="status">The video could not load. Explore the full portfolio using the link alongside.</p>
        </> : <video ref={videoRef} src={loaded ? VIDEO : undefined} poster={POSTER}
          controls muted loop playsInline preload="none" aria-label="Project showreel"
          width={1280} height={720} onError={() => setFailed(true)}
          onPlay={() => { userPaused.current = false }}
          onPause={() => {
            if (automaticPause.current) automaticPause.current = false
            else userPaused.current = true
          }}>
          Your browser does not support this video. <a href={VIDEO}>Open the project showreel</a>.
        </video>}
      </div>
    </div>
  )
}
