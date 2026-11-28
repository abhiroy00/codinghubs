import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import * as analytics from '../src/lib/analytics.ts'

const events = [], listeners = []
globalThis.document = { referrer: 'https://www.google.com/search?q=private%40example.test', addEventListener: (_name, fn) => listeners.push(fn) }
globalThis.localStorage = { setItem() {} }
beforeEach(() => {
  events.length = 0
  globalThis.window = { location: new URL('https://codinghubs.in/courses/python-training-course/?email=private@example.test'), gtag: (...args) => events.push(args) }
})

test('accepted enquiries emit funnel events once without form values or query strings', () => {
  analytics.trackLead('enquiry', 'Python')
  assert.deepEqual(events.map(row => row[1]), ['generate_lead', 'form_submission', 'course_enquiry'])
  for (const [, , params] of events) {
    assert.equal(params.page_location, 'https://codinghubs.in/courses/python-training-course/')
    assert.equal(params.page_referrer, 'https://www.google.com/')
    assert(!JSON.stringify(params).includes('private'))
  }
})

test('demo success has its own event and private routes emit no custom events', () => {
  analytics.trackLead('demo', 'Python')
  assert.equal(events.filter(row => row[1] === 'demo_booking').length, 1)
  events.length = 0
  window.location = new URL('https://codinghubs.in/reset-password/private-token')
  analytics.track('contact', { method: 'phone' })
  assert.equal(events.length, 0)
})

test('analytics parameter allowlist rejects personal values and arbitrary fields', () => {
  analytics.track('offer_view', { campaign_id: '3', email: 'private@example.test', course: 'private@example.test', page_path: '/private' })
  const params = events[0][2]
  assert.equal(params.campaign_id, '3')
  assert.equal(params.email, undefined)
  assert.equal(params.course, undefined)
  assert.equal(params.page_path, '/courses/python-training-course/')
})

test('an unavailable analytics library cannot break an accepted form submission', () => {
  window.gtag = () => { throw new Error('Blocked analytics library') }
  assert.doesNotThrow(() => analytics.trackLead('demo', 'Python'))
})

test('public content events deduplicate repeat effects but count later route visits', () => {
  analytics.trackContentView('/')
  analytics.trackContentView('/courses/python-training-course/')
  analytics.trackContentView('/courses/python-training-course/')
  analytics.trackContentView('/interview/python-training-course/')
  analytics.trackContentView('/courses/python-training-course/')
  assert.deepEqual(events.map(row => row[1]), ['course_view', 'interview_content_view', 'course_view'])
})

test('one delegated listener tracks phone, WhatsApp and published brochure downloads', () => {
  analytics.trackContactClicks()
  analytics.trackContactClicks()
  assert.equal(listeners.length, 1)
  for (const href of ['tel:+917464099059', 'https://wa.me/917464099059?text=private', '/api/courses/brochures/python-training-course/download/']) {
    listeners[0]({ target: { closest: () => ({ getAttribute: () => href }) } })
  }
  assert.deepEqual(events.map(row => row[1]), ['contact', 'phone_click', 'contact', 'whatsapp_click', 'brochure_download', 'resource_download'])
  assert(!JSON.stringify(events).includes('917464099059'))
  assert(!JSON.stringify(events).includes('private'))
})
