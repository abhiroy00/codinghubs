import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth-context'
import type { Course, CreateOrderResponse } from '../lib/types'
import { loadRazorpayScript } from '../lib/razorpay'

export function CourseCheckout() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let active = true
    api
      .get<Course>(`/courses/${slug}/`)
      .then(({ data }) => active && setCourse(data))
      .catch(() => active && setError('Course not found.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [slug])

  async function handleEnroll() {
    if (!course) return
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/enroll/${slug}` } } })
      return
    }
    setError('')
    setPaying(true)
    try {
      const scriptOk = await loadRazorpayScript()
      if (!scriptOk) throw new Error('Could not load Razorpay checkout. Check your connection and try again.')

      const { data: order } = await api.post<CreateOrderResponse>('/payments/create-order/', { course_id: course.id })

      const rzp = new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'Coding Hubs School of AI',
        description: order.course_name,
        prefill: { name: user.username, email: user.email, contact: user.phone },
        theme: { color: '#4f46e5' },
        handler: async (response) => {
          try {
            await api.post('/payments/verify/', response)
            setSuccess(true)
          } catch {
            setError('Payment was captured but verification failed. Contact support with your payment ID.')
          } finally {
            setPaying(false)
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      })
      rzp.open()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="container-x" style={{ padding: '6rem 0', textAlign: 'center', color: 'var(--color-muted)' }}>
        Loading…
      </div>
    )
  }

  if (!course) {
    return (
      <div className="container-x" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <p>Course not found.</p>
        <Link to="/#courses" style={{ textDecoration: 'underline', textUnderlineOffset: '2px' }}>
          Browse programs
        </Link>
      </div>
    )
  }

  return (
    <section className="section" aria-labelledby="checkout-heading">
      <div className="container-x" style={{ maxWidth: '32rem' }}>
        <p className="eyebrow rv">Enroll</p>
        <h1 id="checkout-heading" className="display-lg mt-4">
          {course.name}
        </h1>
        <p className="lede mt-4">
          {course.duration_display}
        </p>

        {success ? (
          <div style={{ marginTop: '2rem' }}>
            <p style={{ color: 'var(--color-success)', fontWeight: 600 }}>Payment successful — you're enrolled! 🎉</p>
            <Link to="/dashboard" className="btn btn-ink" style={{ marginTop: '1rem', display: 'inline-flex' }}>
              <span className="shine"></span>
              <span>Go to dashboard</span>
            </Link>
          </div>
        ) : (
          <div style={{ marginTop: '2rem' }}>
            {error && <p style={{ color: '#be123c', fontSize: '.875rem', marginTop: '.5rem' }}>{error}</p>}
            <button type="button" className="btn btn-lime" style={{ marginTop: '1rem' }} onClick={handleEnroll} disabled={paying}>
              <span className="shine"></span>
              <span>{paying ? 'Opening secure checkout…' : 'Enroll now'}</span>
            </button>
            <p className="form-note">Payments are processed securely by Razorpay.</p>
          </div>
        )}
      </div>
    </section>
  )
}
