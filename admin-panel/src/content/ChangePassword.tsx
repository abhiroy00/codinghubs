import { useState, type FormEvent } from 'react'
import { adminApi } from '../api'
import { Text } from './fields'

export function ChangePassword({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ current_password: '', new_password: '', again: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setMsg('')
    if (f.new_password !== f.again) return setErrors({ again: 'The two new passwords do not match.' })
    setBusy(true)
    try {
      await adminApi.post('/change-password/', { current_password: f.current_password, new_password: f.new_password })
      setErrors({})
      setMsg('Password changed. Signing you out so you can sign in again…')
      setTimeout(onDone, 1500)
    } catch (err) {
      const d = (err as { response?: { data?: Record<string, string[] | string> } })?.response?.data ?? {}
      setErrors(Object.fromEntries(Object.entries(d).map(([k, v]) => [k, Array.isArray(v) ? v.join(' ') : String(v)])))
    } finally {
      setBusy(false)
    }
  }
  const pw = (id: keyof typeof f, label: string) => (
    <div className="ad-field"><label htmlFor={id}>{label}</label>
      <input id={id} className="ad-input" type="password" autoComplete={id === 'current_password' ? 'current-password' : 'new-password'} value={f[id]} onChange={(e) => setF({ ...f, [id]: e.target.value })} />
      {errors[id] && <p className="ad-field-error" role="alert">{errors[id]}</p>}
    </div>
  )
  void Text
  return (
    <form className="ad-post" onSubmit={(e) => void submit(e)}>
      <div className="ad-post-card">
        <header className="ad-post-head"><h1><span className="ad-post-ico" aria-hidden="true">🔑</span> Change Password</h1></header>
        <div className="ad-post-body">
          {msg && <div className="ad-notice ok" role="status">{msg}</div>}
          {pw('current_password', 'Current password')}
          {pw('new_password', 'New password')}
          <p className="ad-hint">At least 8 characters, not too common, not only numbers.</p>
          {pw('again', 'Repeat the new password')}
          <div className="ad-post-actions"><button className="ad-btn ad-btn-blue" disabled={busy || !f.current_password || !f.new_password}>{busy ? 'Saving…' : 'Change password'}</button></div>
        </div>
      </div>
    </form>
  )
}
