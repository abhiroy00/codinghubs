import { useState, type ReactNode } from 'react'
import { uploadImage } from './RichEditor'
import { Counter } from './seoTools'

export function Field({ label, htmlFor, error, hint, children, extra }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <div className={`ad-field${error ? ' has-error' : ''}`}>
      <div className="ad-field-head">
        <label htmlFor={htmlFor}>{label}</label>
        {extra}
      </div>
      {children}
      {hint && !error && <p className="ad-hint">{hint}</p>}
      {error && (
        <p className="ad-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function Text({ id, label, value, onChange, error, hint, max, min, placeholder, textarea, rows = 3, required }: {
  id: string; label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string; max?: number; min?: number; placeholder?: string; textarea?: boolean; rows?: number; required?: boolean
}) {
  const common = { id, value, placeholder, 'aria-invalid': !!error, 'aria-required': required, onChange: (e: { target: { value: string } }) => onChange(e.target.value), className: 'ad-input', maxLength: max ? max + 200 : undefined }
  return (
    <Field label={required ? `${label} *` : label} htmlFor={id} error={error} hint={hint} extra={max ? <Counter value={value} min={min ?? 0} max={max} /> : undefined}>
      {textarea ? <textarea rows={rows} {...common} /> : <input type="text" {...common} />}
    </Field>
  )
}

/** Comma/Enter separated chips. */
export function Chips({ id, label, value, onChange, hint, max = 15 }: { id: string; label: string; value: string[]; onChange: (v: string[]) => void; hint?: string; max?: number }) {
  const [text, setText] = useState('')
  const add = (raw: string) => {
    const items = raw.split(',').map((s) => s.trim()).filter(Boolean)
    if (!items.length) return
    const next = [...value]
    for (const i of items) if (next.length < max && !next.some((n) => n.toLowerCase() === i.toLowerCase())) next.push(i)
    onChange(next)
    setText('')
  }
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="ad-chips">
        {value.map((v) => (
          <span key={v} className="ad-chip">
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))}>
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          placeholder={value.length ? '' : 'Type and press Enter'}
          onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setText(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(text)
            } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1))
          }}
          onBlur={() => add(text)}
        />
      </div>
    </Field>
  )
}

export function ImageField({ id, label, src, alt, onSrc, onAlt, errors }: { id: string; label: string; src: string; alt: string; onSrc: (v: string) => void; onAlt?: (v: string) => void; errors?: { src?: string; alt?: string } }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const pick = async (file?: File) => {
    if (!file) return
    setBusy(true)
    setMsg('')
    try {
      onSrc(await uploadImage(file, file.name))
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setMsg(detail ?? 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="ad-image">
      <Field label={label} htmlFor={id} error={errors?.src ?? (msg || undefined)} hint="JPEG, PNG, WebP or GIF, up to 5 MB. Wide images (1200×630) work best.">
        {src && <img src={src} alt="" className="ad-thumb" />}
        <div className="ad-image-actions">
          <label className="ad-btn">
            {busy ? 'Uploading…' : src ? 'Replace image' : 'Upload image'}
            <input id={id} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden disabled={busy} onChange={(e) => void pick(e.target.files?.[0])} />
          </label>
          {src && (
            <button type="button" className="ad-btn" onClick={() => onSrc('')}>
              Remove
            </button>
          )}
        </div>
      </Field>
      {onAlt && src && <Text id={`${id}-alt`} label="Image description (alt text)" value={alt} onChange={onAlt} max={200} error={errors?.alt} hint="Describe the image for people who cannot see it." />}
    </div>
  )
}

/** Collapsible group. Children (e.g. a rich editor) mount the first time it is opened, then stay mounted. */
export function Section({ title, children, open, badge }: { title: string; children: ReactNode; open?: boolean; badge?: ReactNode }) {
  const [mounted, setMounted] = useState(!!open)
  return (
    <details className="ad-section" open={open} onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && setMounted(true)}>
      <summary>
        {title}
        {badge}
      </summary>
      <div className="ad-section-body">{mounted && children}</div>
    </details>
  )
}
