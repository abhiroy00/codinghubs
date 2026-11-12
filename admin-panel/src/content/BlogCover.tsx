import { useState } from 'react'
import { uploadImage } from './RichEditor'
import { Text } from './fields'

export function BlogCover({ src, alt, onSrc, onAlt, error, altError, onBusy }: { src: string; alt: string; onSrc: (value: string) => void; onAlt: (value: string) => void; error?: string; altError?: string; onBusy: (busy: boolean) => void }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const upload = async (file?: File) => {
    if (!file) return
    setBusy(true)
    onBusy(true)
    setMessage('')
    try { onSrc(await uploadImage(file, file.name)) }
    catch { setMessage('Could not upload the image. Choose a JPG, PNG, WebP or GIF under 5 MB and try again.') }
    finally { setBusy(false); onBusy(false) }
  }
  return <section className="ad-blog-cover" aria-labelledby="cover-label">
    <div className="ad-field-head"><label id="cover-label" htmlFor="blog-cover">Cover image</label><span className="ad-muted">Optional</span></div>
    {src && <img className="ad-blog-cover-preview" src={src} alt={alt || 'Cover preview'} />}
    <input id="blog-cover" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = '' }} />
    <p className="ad-hint">JPG, PNG, WebP or GIF, up to 5 MB. A wide image works best.</p>
    {(message || error) && <p className="ad-field-error" role="alert">{message || error}</p>}
    {busy && <p role="status">Uploading image…</p>}
    {src && <>
      <Text id="featured_image_alt" label="Describe the image" value={alt} onChange={onAlt} error={altError} hint="A short description for readers who cannot see it." />
      <button type="button" className="ad-link" disabled={busy} onClick={() => onSrc('')}>Remove cover</button>
    </>}
  </section>
}
