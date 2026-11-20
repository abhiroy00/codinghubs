import { useState } from 'react'
import { copyText, isLiveNow, publicUrl } from './liveUrl'

/** Row actions: live items get their public URL (open + copy); anything not yet live keeps the private preview. */
export function LiveActions({ base, slug, status, publishedAt, onPreview }: {
  base: string
  slug: string
  status: string
  publishedAt: string | null | undefined
  onPreview: () => void
}) {
  const [copied, setCopied] = useState(false)
  if (!isLiveNow(status, publishedAt)) {
    return <button type="button" className="ad-link" onClick={onPreview}>Preview</button>
  }
  const url = publicUrl(base, slug)
  return (
    <>
      <a className="ad-link" href={url} target="_blank" rel="noopener noreferrer">View live</a>
      <button type="button" className="ad-link" title={url} onClick={async () => setCopied(await copyText(url))}>
        {copied ? 'Copied' : 'Copy URL'}
      </button>
    </>
  )
}

/** The public URL of a live item, shown in its editor so the right link is the one people copy. */
export function LiveUrlField({ base, slug }: { base: string; slug: string }) {
  const [copied, setCopied] = useState(false)
  const url = publicUrl(base, slug)
  return (
    <p className="ad-hint ad-live-url">
      Live URL: <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>{' '}
      <button type="button" className="ad-link" onClick={async () => setCopied(await copyText(url))}>{copied ? 'Copied' : 'Copy URL'}</button>
      <br />Share this link and use it in Google Search Console. Preview links are private and are never indexed.
    </p>
  )
}
