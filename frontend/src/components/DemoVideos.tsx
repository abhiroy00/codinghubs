import { useCallback, useState } from 'react'
import { DEMO_VIDEOS, getYouTubeId, thumbnailFor, type DemoVideo } from '../data/demoVideos'
import { AnimatedCard, Reveal, VideoModal } from './ui'
import './demo-videos.css'

type Playable = DemoVideo & { videoId: string }

function Thumb({ v }: { v: Playable }) {
  const [src, setSrc] = useState(thumbnailFor(v, v.videoId))
  return (
    <img src={src} alt={`${v.course} demo class at Coding Hub`} width={480} height={270} loading="lazy" decoding="async"
      onError={() => setSrc(`https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`)} />
  )
}

/** Thumbnail grid of YouTube demo classes; clicking one opens the shared <VideoModal>. Renders nothing until videos are added. */
export function DemoVideos({ videos = DEMO_VIDEOS }: { videos?: DemoVideo[] }) {
  const playable = videos.flatMap((v) => { const videoId = getYouTubeId(v.youtubeUrl); return videoId ? [{ ...v, videoId }] : [] })
  const [active, setActive] = useState<Playable | null>(null)
  const close = useCallback(() => setActive(null), [])
  if (!playable.length) return null

  return (
    <div className="dv">
      <Reveal as="ul" stagger className="dv-grid" aria-label="Demo class videos">
        {playable.map((v) => (
          <li key={v.id}>
            <AnimatedCard as="div" className="dv-card" media={<>
              <Thumb v={v} />
              <span className="dv-play" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="26" height="26"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
              </span>
            </>}>
              <h3 className="dv-title">
                <button type="button" onClick={() => setActive(v)} aria-haspopup="dialog">
                  {v.course} <span className="sr-only">: play demo class</span>
                </button>
              </h3>
              <p className="dv-meta">Free demo class · Coding Hub</p>
            </AnimatedCard>
          </li>
        ))}
      </Reveal>
      <VideoModal videoId={active?.videoId ?? null} title={active ? `${active.course} demo class` : ''} onClose={close} />
    </div>
  )
}
