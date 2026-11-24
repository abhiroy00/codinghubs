import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LearnFrame } from '../learning/LearnFrame'
import { api } from '../lib/api'
import { CERTIFICATE_VERIFY_META, pageSeo } from '../seo/site'
import { VerifyForm } from './Certificates'
import './certificates.css'

interface Result {
  status: 'valid' | 'revoked' | 'replaced' | 'not_found' | 'limited' | 'error'
  certificate?: { code: string; initials: string; course_name: string; completed_on: string; issued_on: string }
}

const SAMPLE_ID = 'CH-SAMP-LE00-0000'
const longDate = (value: string) => new Date(`${value}T00:00:00+05:30`).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long' })

const HEADLINE: Record<Result['status'], string> = {
  valid: 'Valid certificate',
  revoked: 'This certificate has been revoked',
  replaced: 'This certificate ID has been replaced',
  not_found: 'No certificate found with this ID',
  limited: 'Too many checks',
  error: 'Could not check right now',
}
const DETAIL: Record<Result['status'], string> = {
  valid: 'Coding Hubs School of AI issued this certificate. Check that the initials and course match the person who showed it to you.',
  revoked: 'Coding Hubs School of AI no longer recognises this certificate.',
  replaced: 'A corrected certificate was issued with a new ID. Ask the holder for their latest certificate.',
  not_found: 'Check the ID for typos. IDs look like CH-XXXX-XXXX-XXXX and never contain 0, O, 1, I or L.',
  limited: 'Please wait a minute and try again.',
  error: 'Please check your connection and try again.',
}

/** /certificates/verify/?id=: the public verification result. Never indexed (meta robots + X-Robots-Tag in nginx). */
export function CertificateVerify() {
  const [params] = useSearchParams()
  const id = (params.get('id') ?? '').trim()
  const seo = useMemo(() => pageSeo(CERTIFICATE_VERIFY_META), [])
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    setResult(null)
    if (!id) return
    if (id.toUpperCase().replace(/[^A-Z0-9]/g, '') === SAMPLE_ID.replace(/-/g, '')) { setResult({ status: 'not_found' }); return }
    let live = true
    api.get<Result>('/certificates/verify/', { params: { id } })
      .then(({ data }) => { if (live) setResult(data) })
      .catch((error) => {
        if (!live) return
        const code = error?.response?.status
        setResult(code === 404 ? { status: 'not_found' } : code === 429 ? { status: 'limited' } : { status: 'error' })
      })
    return () => { live = false }
  }, [id])

  const isSample = id.toUpperCase().replace(/[^A-Z0-9]/g, '') === SAMPLE_ID.replace(/-/g, '')
  return (
    <LearnFrame metadata={seo} trail={[{ label: 'Certificates', to: '/certificates/' }, { label: 'Verify' }]}>
      <div className="learn-shell certificates-page">
        <header className="learn-hero">
          <p className="learn-kicker">CERTIFICATE VERIFICATION</p>
          <h1>Verify a Coding Hubs certificate</h1>
        </header>
        <section className="learn-section">
          {id && !result && <p className="learn-muted" role="status">Checking {id}…</p>}
          {result && (
            <div className={`cert-result cert-result-${result.status}`} role="status">
              <strong>{isSample ? 'This is the sample ID' : HEADLINE[result.status]}</strong>
              <p>{isSample ? 'CH-SAMP-LE00-0000 appears only on our sample certificate and is not a real certificate.' : DETAIL[result.status]}</p>
              {result.certificate && (
                <dl>
                  <dt>Certificate ID</dt><dd><code>{result.certificate.code}</code></dd>
                  <dt>Course</dt><dd>{result.certificate.course_name}</dd>
                  <dt>Holder&apos;s initials</dt><dd>{result.certificate.initials}</dd>
                  <dt>Completed</dt><dd>{longDate(result.certificate.completed_on)}</dd>
                  <dt>Issued</dt><dd>{longDate(result.certificate.issued_on)}</dd>
                </dl>
              )}
            </div>
          )}
          <VerifyForm initial={id} />
          <p className="learn-muted">Need help, or think a result is wrong? <Link to="/#contact">Contact Coding Hubs</Link>. To apply for or download your own certificate, go to <Link to="/certificates/">Certificates</Link>.</p>
        </section>
      </div>
    </LearnFrame>
  )
}
