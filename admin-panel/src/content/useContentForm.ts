import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../api'
import { fromApi, slugify, toApi, type Common, type Kind, type Revision } from './types'

type Errors = Record<string, string>
const draftKey = (kind: Kind, id: string | undefined) => `ch_admin_draft_${kind}_${id ?? 'new'}`

function formatError(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(formatError).filter(Boolean).join(' ')
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, nested]) => `${key}: ${formatError(nested)}`)
      .filter((entry) => !entry.endsWith(': '))
      .join('; ')
  }
  return String(value)
}

function readErrors(err: unknown): { fields: Errors; message: string } {
  const data = (err as { response?: { data?: unknown; status?: number } })?.response?.data
  const status = (err as { response?: { status?: number } })?.response?.status
  if (status === 403) return { fields: {}, message: 'Your account does not have permission to do that.' }
  if (data && typeof data === 'object') {
    const fields: Errors = {}
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) fields[k] = formatError(v)
    const first = Object.values(fields)[0]
    const details = Object.entries(fields).filter(([key]) => key !== 'detail').map(([key, value]) => `${key}: ${value}`).join(' ')
    return { fields, message: fields.detail || (first ? `Please fix the highlighted fields. ${details}` : 'Something went wrong. Please try again.') }
  }
  return { fields: {}, message: 'Could not reach the server. Your changes are kept on this page; try again.' }
}

/** Load/save/publish workflow shared by the blog and case-study editors. */
export function useContentForm<T extends Common>(kind: Kind, blank: T) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<T>(blank)
  const [saved, setSaved] = useState(JSON.stringify(blank))
  const [loading, setLoading] = useState(!!id)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [notice, setNotice] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [recover, setRecover] = useState<T | null>(null)
  const [revisions, setRevisions] = useState<Revision[]>([])
  const slugTouched = useRef(false)
  const dirty = useMemo(() => JSON.stringify(form) !== saved, [form, saved])

  const adopt = useCallback(
    (data: unknown) => {
      const next = fromApi(blank, data)
      setForm(next)
      setSaved(JSON.stringify(next))
      return next
    },
    [blank],
  )

  // load
  useEffect(() => {
    let live = true
    const stored = (() => {
      try {
        return localStorage.getItem(draftKey(kind, id))
      } catch {
        return null
      }
    })()
    const maybeRecover = (base: T) => {
      if (!stored) return
      try {
        const local = JSON.parse(stored) as T
        if (JSON.stringify(local) !== JSON.stringify(base)) setRecover(local)
      } catch {
        /* ignore a corrupt draft */
      }
    }
    if (!id) {
      maybeRecover(blank)
      return
    }
    setLoading(true)
    adminApi
      .get(`/${kind}/${id}/`)
      .then(({ data }) => {
        if (!live) return
        maybeRecover(adopt(data))
        slugTouched.current = true
      })
      .catch(() => live && setNotice({ type: 'error', text: 'Could not load this item.' }))
      .finally(() => live && setLoading(false))
    adminApi
      .get<Revision[]>(`/${kind}/${id}/revisions/`)
      .then(({ data }) => live && setRevisions(data))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [id, kind]) // eslint-disable-line react-hooks/exhaustive-deps

  // browser-local draft recovery (never the source of truth)
  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey(kind, id), JSON.stringify(form))
      } catch {
        /* storage unavailable */
      }
    }, 1500)
    return () => clearTimeout(t)
  }, [form, dirty, kind, id])

  // unsaved-changes warning on tab close / reload
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setForm((f) => {
      const next = { ...f, [key]: value }
      if (key === 'title' && !slugTouched.current && !f.id) (next as Common).slug = slugify(String(value))
      return next
    })
    setErrors((e) => {
      if (!(key as string in e)) return e
      const { [key as string]: _drop, ...rest } = e
      void _drop
      return rest
    })
  }, [])
  const setSlug = (v: string) => {
    slugTouched.current = true
    set('slug' as keyof T, slugify(v) as T[keyof T])
  }

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey(kind, id))
      localStorage.removeItem(draftKey(kind, undefined))
    } catch {
      /* ignore */
    }
  }

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    setNotice(null)
    try {
      const data = await fn()
      setErrors({})
      setNotice({ type: 'ok', text: ok })
      return data
    } catch (err) {
      const { fields, message } = readErrors(err)
      setErrors(fields)
      setNotice({ type: 'error', text: message })
      return null
    } finally {
      setBusy(false)
    }
  }

  const save = async (override?: Partial<T>, message = 'Saved.') => {
    const payload = toApi({ ...form, ...override } as Common)
    const data = (await run(async () => (form.id ? (await adminApi.patch(`/${kind}/${form.id}/`, payload)).data : (await adminApi.post(`/${kind}/`, payload)).data), message)) as { id: number } | null
    if (!data) return null
    adopt(data)
    clearDraft()
    if (!form.id) navigate(`/${kind}/edit/${data.id}`, { replace: true })
    return data
  }

  const action = async (name: 'publish' | 'unpublish' | 'archive', message: string, body?: object) => {
    if (!form.id) return
    const data = await run(async () => (await adminApi.post(`/${kind}/${form.id}/${name}/`, body ?? {})).data, message)
    if (data) adopt(data)
  }

  const publish = async (when?: string) => {
    const saved = await save(undefined, '')
    if (!saved) return
    const id2 = (saved as { id: number }).id
    setBusy(true)
    try {
      const { data } = await adminApi.post(`/${kind}/${id2}/publish/`, when ? { published_at: new Date(when).toISOString() } : {})
      adopt(data)
      setNotice({ type: 'ok', text: data.status === 'scheduled' ? 'Scheduled. It goes live automatically at the chosen time.' : 'Published. It is now live on the website.' })
      setErrors({})
    } catch (err) {
      const { fields, message } = readErrors(err)
      setErrors(fields)
      setNotice({ type: 'error', text: message })
    } finally {
      setBusy(false)
    }
  }

  const preview = async () => {
    const data = await save(undefined, 'Saved. Opening preview…')
    if (!data) return
    const win = window.open('', '_blank')
    try {
      const { data: p } = await adminApi.post<{ url: string }>(`/${kind}/${(data as { id: number }).id}/preview/`)
      if (win) win.location.href = p.url
    } catch {
      win?.close()
      setNotice({ type: 'error', text: 'Could not open the preview.' })
    }
  }

  const remove = async () => {
    if (!form.id) return
    const ok = await run(async () => adminApi.delete(`/${kind}/${form.id}/`), 'Deleted.')
    if (ok) {
      clearDraft()
      setSaved(JSON.stringify(form)) // nothing left to warn about
      navigate(`/${kind}`, { replace: true })
    }
  }

  const restoreRevision = async (revId: number) => {
    if (!form.id) return
    const ok = await run(async () => adminApi.post(`/${kind}/${form.id}/revisions/${revId}/restore/`), 'Earlier version restored.')
    if (ok) {
      const { data } = await adminApi.get(`/${kind}/${form.id}/`)
      adopt(data)
    }
  }

  return {
    id, form, set, setSlug, setForm, dirty, loading, busy, errors, notice, setNotice, recover, revisions,
    acceptDraft: () => {
      if (recover) setForm(recover)
      setRecover(null)
    },
    dropDraft: () => {
      clearDraft()
      setRecover(null)
    },
    save, publish, action, preview, remove, restoreRevision,
  }
}
