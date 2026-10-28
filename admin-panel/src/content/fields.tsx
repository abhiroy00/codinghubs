import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { adminApi } from '../api'
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

export function NumberField({ id, label, value, onChange, error, hint, step = '1', min }: { id: string; label: string; value: string | number | null; onChange: (v: string) => void; error?: string; hint?: string; step?: string; min?: number }) {
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint}>
      <input id={id} className="ad-input" type="number" inputMode="decimal" step={step} min={min} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}

export function SelectField({ id, label, value, onChange, options, error, hint }: { id: string; label: string; value: string | number; onChange: (v: string) => void; options: [string | number, string][]; error?: string; hint?: string }) {
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint}>
      <select id={id} className="ad-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={String(v)} value={v}>{l}</option>
        ))}
      </select>
    </Field>
  )
}

export function CheckField({ id, label, checked, onChange, hint }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="ad-field">
      <label className="ad-check" htmlFor={id}>
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
      </label>
      {hint && <p className="ad-hint">{hint}</p>}
    </div>
  )
}

type RowField = { key: string; label: string; type?: 'text' | 'textarea' | 'image'; placeholder?: string }
/** Repeatable rows (features, screenshots, FAQ ...). Any number of rows up to `max`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RowsEditor({ id, rows, onChange, fields, addLabel, max = 30, error }: { id: string; rows: any[]; onChange: (r: any[]) => void; fields: RowField[]; addLabel: string; max?: number; error?: string }) {
  const blank = () => Object.fromEntries(fields.map((f) => [f.key, '']))
  return (
    <div>
      {rows.map((row, i) => (
        <div key={i} className="ad-row-card">
          {fields.map((f) =>
            f.type === 'image' ? (
              <ImageField key={f.key} id={`${id}-${f.key}-${i}`} label={f.label} src={row[f.key] ?? ''} alt="" onSrc={(v) => onChange(rows.map((r, n) => (n === i ? { ...r, [f.key]: v } : r)))} />
            ) : (
              <Text key={f.key} id={`${id}-${f.key}-${i}`} label={f.label} textarea={f.type === 'textarea'} rows={2} value={row[f.key] ?? ''} placeholder={f.placeholder} onChange={(v) => onChange(rows.map((r, n) => (n === i ? { ...r, [f.key]: v } : r)))} />
            ),
          )}
          <button type="button" className="ad-link ad-danger" onClick={() => onChange(rows.filter((_, n) => n !== i))}>Remove</button>
        </div>
      ))}
      {rows.length < max && (
        <button type="button" className="ad-btn" onClick={() => onChange([...rows, blank()])}>{addLabel}</button>
      )}
      {error && <p className="ad-field-error" role="alert">{error}</p>}
    </div>
  )
}

export interface AssetRow {
  id: number
  label: string
  size: number
  content_type: string
  original_name: string
}
/** Private files (PDF, ZIP, SQL ...). Stored outside the public web root; shown to buyers only through expiring links. */
export function AssetPanel({ endpoint, ownerId, title = 'Private files', onCount, saveFirst = 'Save the draft first, then you can attach files.' }: { endpoint: string; ownerId?: number; title?: string; onCount?: (n: number) => void; saveFirst?: string }) {
  const [rows, setRows] = useState<AssetRow[]>([])
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const load = useCallback(() => {
    if (!ownerId) return
    adminApi.get(`/${endpoint}/${ownerId}/`).then((r) => { setRows(r.data.assets ?? []); onCount?.((r.data.assets ?? []).length) }).catch(() => undefined)
  }, [endpoint, ownerId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load])
  if (!ownerId) return <section className="ad-panel"><h2>{title}</h2><p className="ad-hint">{saveFirst}</p></section>
  const upload = async (f?: File) => {
    if (!f) return
    setBusy(true)
    setMsg('')
    const fd = new FormData()
    fd.append('file', f)
    fd.append('label', label || f.name)
    try {
      await adminApi.post(`/${endpoint}/${ownerId}/assets/`, fd)
      setLabel('')
      load()
    } catch (err) {
      setMsg((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }
  const remove = async (a: AssetRow) => {
    if (!window.confirm(`Delete “${a.label}” permanently? Customers who bought it lose this file.`)) return
    await adminApi.delete(`/assets/${a.id}/`)
    load()
  }
  return (
    <section className="ad-panel">
      <h2>{title}</h2>
      <p className="ad-hint">PDF, ZIP, EPUB, DOCX, PPTX, XLSX, SQL, TXT, MD, CSV or images up to 100 MB. Files are checked by content and are never publicly reachable.</p>
      <ul className="ad-revs">
        {rows.map((a) => (
          <li key={a.id}><span>{a.label} <small className="ad-muted">({a.original_name}, {a.size > 1048576 ? `${(a.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(a.size / 1024))} KB`})</small></span><button type="button" className="ad-link ad-danger" onClick={() => void remove(a)}>Delete</button></li>
        ))}
      </ul>
      <Text id={`asset-label-${endpoint}`} label="Label for the next file" value={label} onChange={setLabel} placeholder="e.g. Source code (ZIP)" />
      <label className="ad-btn">
        {busy ? 'Uploading…' : 'Upload a file'}
        <input type="file" hidden disabled={busy} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = '' }} />
      </label>
      {msg && <p className="ad-field-error" role="alert">{msg}</p>}
    </section>
  )
}

/** Thumbnail with the two ways editors expect: upload from the computer (click or drop) or paste a URL. */
export function ThumbnailField({ id, label = 'Thumbnail image', src, alt, onSrc, onAlt, error, altError }: { id: string; label?: string; src: string; alt: string; onSrc: (v: string) => void; onAlt: (v: string) => void; error?: string; altError?: string }) {
  const [tab, setTab] = useState<'upload' | 'url'>('upload')
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [msg, setMsg] = useState('')
  const pick = async (file?: File) => {
    if (!file) return
    setBusy(true)
    setMsg('')
    try {
      onSrc(await uploadImage(file, file.name))
    } catch (err) {
      setMsg((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="ad-thumb-field">
      <span className="ad-label">{label}</span>
      <div className="ad-tabs" role="tablist" aria-label="Image source">
        <button type="button" role="tab" aria-selected={tab === 'upload'} className={tab === 'upload' ? 'on' : ''} onClick={() => setTab('upload')}>⬆ Upload from Computer</button>
        <button type="button" role="tab" aria-selected={tab === 'url'} className={tab === 'url' ? 'on' : ''} onClick={() => setTab('url')}>🔗 Paste URL</button>
      </div>
      {tab === 'upload' ? (
        <label
          htmlFor={id}
          className={`ad-drop${drag ? ' drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); void pick(e.dataTransfer.files?.[0]) }}
        >
          {src ? <img src={src} alt="" className="ad-drop-img" /> : <span className="ad-drop-ico" aria-hidden="true">☁</span>}
          <strong>{busy ? 'Uploading…' : src ? 'Click to replace the image' : 'Click to choose image'}</strong>
          <small>JPG, PNG, WEBP, GIF — max 5 MB. Drag and drop works too.</small>
          <input id={id} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden disabled={busy} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }} />
        </label>
      ) : (
        <input id={id} className="ad-input" type="url" value={src} placeholder="https://… or an uploaded /media/ path" onChange={(e) => onSrc(e.target.value)} aria-label="Image URL" />
      )}
      {(error || msg) && <p className="ad-field-error" role="alert">{error || msg}</p>}
      {src && (
        <div className="ad-thumb-row">
          <Text id={`${id}-alt`} label="Image description (alt text)" value={alt} onChange={onAlt} max={200} error={altError} hint="Describe the image for people who cannot see it (and for search engines)." />
          <button type="button" className="ad-link ad-danger" onClick={() => onSrc('')}>Remove image</button>
        </div>
      )}
    </div>
  )
}
