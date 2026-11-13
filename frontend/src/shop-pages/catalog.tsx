import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useSeo } from '../content-pages/shared'
import { errorText, fmtSize, get, initial, shop } from './api'

/* eslint-disable @typescript-eslint/no-explicit-any */
export function useDetail(kind: 'project' | 'guide', apiBase: string) {
  const { slug = '' } = useParams<{ slug: string }>()
  const { search } = window.location.pathname ? { search: window.location.search } : { search: '' }
  const preview = new URLSearchParams(search).get('preview') ?? undefined
  const seedRef = useRef<any>(undefined)
  if (seedRef.current === undefined) {
    const i = initial()
    seedRef.current = i && i.kind === kind && i.slug === slug ? i.article : null
  }
  const [data, setData] = useState<any>(seedRef.current)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let live = true
    setMissing(false)
    get(`${apiBase}/${slug}/`, preview ? { preview } : undefined)
      .then((d) => live && setData(d))
      .catch(() => live && !seedRef.current && setMissing(true))
    return () => {
      live = false
    }
  }, [slug, preview]) // eslint-disable-line react-hooks/exhaustive-deps
  useSeo(data?.seo ?? null)
  return { data, missing, slug }
}

export function Html({ html }: { html?: string }) {
  // sanitised on the server (allowlist) when saved and again when served
  return html ? <div className="bl-body" dangerouslySetInnerHTML={{ __html: html }} /> : null
}

export function FileList({ files, base, slug }: { files: any[]; base: string; slug: string }) {
  const [err, setErr] = useState('')
  const open = async (id: number) => {
    setErr('')
    try {
      const { data } = await shop.post(`${base}/${slug}/files/${id}/link/`, {})
      window.location.assign(data.url)
    } catch (e) {
      setErr(errorText(e, 'Please log in to download this file.'))
    }
  }
  if (!files?.length) return null
  return (
    <section>
      <h2>Downloads</h2>
      <ul>{files.map((f) => <li key={f.id}><button type="button" className="ad-link shop-linkbtn" onClick={() => void open(f.id)}>{f.label}</button> <small>({fmtSize(f.size)})</small></li>)}</ul>
      {err && <p className="shop-err" role="alert">{err}</p>}
    </section>
  )
}

export function CodeEnhancedHtml({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    root.querySelectorAll('pre').forEach((pre) => {
      if (pre.parentElement?.classList.contains('code-wrap')) return
      const wrap = document.createElement('div')
      wrap.className = 'code-wrap'
      pre.replaceWith(wrap)
      wrap.appendChild(pre)
      pre.tabIndex = 0
      pre.setAttribute('role', 'region')
      pre.setAttribute('aria-label', 'Code example')
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'code-copy'
      btn.textContent = 'Copy'
      btn.addEventListener('click', () => {
        void navigator.clipboard?.writeText(pre.innerText).then(() => {
          btn.textContent = 'Copied'
          setTimeout(() => (btn.textContent = 'Copy'), 1500)
        })
      })
      wrap.appendChild(btn)
    })
  }, [html])
  return <div ref={ref} className="bl-body" dangerouslySetInnerHTML={{ __html: html }} />
}
