import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { adminApi } from '../api'
import type { Taxon } from './types'

function Manager({ title, endpoint, noun }: { title: string; endpoint: string; noun: string }) {
  const [items, setItems] = useState<Taxon[]>([])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(() => {
    adminApi.get<Taxon[]>(`/${endpoint}/`).then((r) => setItems(r.data)).catch(() => setError('Could not load the list.'))
  }, [endpoint])
  useEffect(load, [load])
  const fail = (err: unknown) => {
    const d = (err as { response?: { data?: { name?: string[]; detail?: string } } })?.response?.data
    setError(d?.name?.[0] ?? d?.detail ?? 'That did not work.')
  }
  const add = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await adminApi.post(`/${endpoint}/`, { name })
      setName('')
      load()
    } catch (err) {
      fail(err)
    }
  }
  const rename = async () => {
    if (!editing) return
    setError('')
    try {
      await adminApi.patch(`/${endpoint}/${editing.id}/`, { name: editing.name })
      setEditing(null)
      load()
    } catch (err) {
      fail(err)
    }
  }
  const remove = async (t: Taxon) => {
    const warn = t.blog_count ? `“${t.name}” is used by ${t.blog_count} post(s). They stay published; only the ${noun} is removed from them. Delete it?` : `Delete “${t.name}”?`
    if (!window.confirm(warn)) return
    try {
      await adminApi.delete(`/${endpoint}/${t.id}/`)
      load()
    } catch (err) {
      fail(err)
    }
  }
  return (
    <section className="ad-panel">
      <h2>{title}</h2>
      <form className="ad-inline-form" onSubmit={add}>
        <label className="sr-only" htmlFor={`new-${endpoint}`}>New {noun} name</label>
        <input id={`new-${endpoint}`} className="ad-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${noun}`} maxLength={80} />
        <button className="ad-btn ad-btn-primary" disabled={!name.trim()}>Add</button>
      </form>
      {error && <p className="ad-field-error" role="alert">{error}</p>}
      {items.length === 0 ? (
        <p className="ad-muted">None yet.</p>
      ) : (
        <ul className="ad-taxa">
          {items.map((t) => (
            <li key={t.id}>
              {editing?.id === t.id ? (
                <>
                  <input className="ad-input" aria-label={`Rename ${t.name}`} value={editing.name} onChange={(e) => setEditing({ id: t.id, name: e.target.value })} />
                  <button type="button" className="ad-link" onClick={() => void rename()}>Save</button>
                  <button type="button" className="ad-link" onClick={() => setEditing(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <span>{t.name} <small className="ad-muted">({t.blog_count})</small></span>
                  <button type="button" className="ad-link" onClick={() => setEditing({ id: t.id, name: t.name })}>Rename</button>
                  <button type="button" className="ad-link ad-danger" onClick={() => void remove(t)}>Delete</button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function Taxonomy() {
  return (
    <>
      <h1 className="ad-h1">Categories &amp; tags</h1>
      <div className="ad-grid2">
        <Manager title="Blog categories" endpoint="blog-categories" noun="category" />
        <Manager title="Blog tags" endpoint="blog-tags" noun="tag" />
      </div>
    </>
  )
}
