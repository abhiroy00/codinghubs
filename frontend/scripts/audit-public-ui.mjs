// Smoke all catalogue/program/location routes and major public page templates at phone and desktop sizes.
// CMS-backed lists use an explicit empty fixture dataset; published-content flows are checked separately.
import { chromium, expect } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5174'
const out = '../artifacts/course-refresh/ui-audit'
const catalogue = await readFile('src/learning/catalog.ts', 'utf8')
const courses = [...catalogue.split('const ROWS: CourseRow[] = [')[1].split('\n]')[0].matchAll(/\['([^']+)', '([^']+)'/g)].map(m => ({ slug: m[1], name: m[2] }))
const locations = [...(await readFile('src/locations/registry.ts', 'utf8')).matchAll(/\{ slug: '([^']+)'/g)].map(m => `/locations/${m[1]}/`)
const programs = [...(await readFile('src/pages/free-session/programs.ts', 'utf8')).matchAll(/slug: '([^']+)'/g)].map(m => `/program/${m[1]}/`)
const main = ['/', '/courses/', '/interview/', '/learn/', '/visual-lab/', '/interview-studio/', '/our-work', '/ai-tools', '/book-a-tutor/', '/latest-jobs/', '/locations/', '/blog', '/case-studies', '/projects', '/project-guides', '/newsletter/', '/brochures/', '/faq', '/policies', '/login', '/register', '/forgot-password', '/ai', '/ai/answer-evaluation', '/ai/mock-interview', '/ai/resume-analyzer', '/ai/job-matcher']
const routes = [...main, ...programs, ...courses.map(c => `/courses/${c.slug}/`), ...courses.map(c => `/interview/${c.slug}/`), ...locations, '/interview/generative-ai/levels/1/', '/interview/generative-ai/levels/1/articles/ai-ml-deep-learning/']
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rows = []
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    await context.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname
      if (/\/brochures\/[^/]+\/$/.test(path) || path.startsWith('/api/courses/prep/')) return route.fulfill({ status: 404, json: { detail: 'Not in the public API fixture dataset; use the repository content.' } })
      const json = path.endsWith('/gigs/status/') ? { enabled: false }
        : path === '/api/interview/resources/' ? { count: 0, results: [], categories: [], difficulties: [] }
        : /^\/api\/(blogs|case-studies|newsletter\/issues|projects|project-guides)\/$/.test(path) ? { count: 0, next: null, previous: null, results: [] }
        : []
      return route.fulfill({ json })
    })
    const page = await context.newPage()
    let errors = []
    page.on('pageerror', e => errors.push(e.message))
    for (const path of routes) {
      errors = []
      try {
        await page.goto(base + path, { waitUntil: 'load' })
        await page.waitForLoadState('networkidle')
        await expect(page.locator('.site-header')).toBeVisible()
        await expect(page.locator('main h1').first()).toBeVisible()
        // Reveal every section and give lazy images a chance to decode.
        for (const section of await page.locator('main > section, main .learn-section, main .course-brochure').all()) {
          if (await section.isVisible()) await section.scrollIntoViewIfNeeded()
        }
        await page.locator('main h1').first().scrollIntoViewIfNeeded()
        const info = await page.evaluate(() => ({
          h1: [...document.querySelectorAll('main h1')].map(x => x.textContent?.trim()),
          sections: [...document.querySelectorAll('main h2')].map(x => x.textContent?.trim()),
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          brokenImages: [...document.querySelectorAll('main img')].filter(x => x.complete && !x.naturalWidth).map(x => x.getAttribute('src')),
        }))
        const course = courses.find(c => path === `/courses/${c.slug}/`)
        if (course) {
          await expect(page.getByRole('region', { name: `${course.name} brochure`, exact: true })).toBeAttached()
          await expect(page.locator('.course-facts > div')).toHaveCount(4)
          for (const name of ['Course overview', 'What you will learn', 'Tools and concepts', 'Curriculum', 'Practical projects', 'Career directions', 'Frequently asked questions']) {
            if (!info.sections.includes(name)) throw Error(`Missing course section: ${name}`)
          }
        }
        if (main.includes(path) || programs.includes(path) || path === '/courses/generative-ai/') {
          await page.evaluate(() => window.scrollTo(0, 0))
          await page.screenshot({ path: `${out}/${width}-${path.replaceAll('/', '_') || 'home'}.png`, fullPage: true })
        }
        rows.push({ width, path, ...info, errors: [...errors] })
        if (info.overflow || info.brokenImages.length || errors.length) console.log('FINDING', width, path, JSON.stringify({ overflow: info.overflow, brokenImages: info.brokenImages, errors }))
      } catch (error) { rows.push({ width, path, failure: error.message, errors: [...errors] }); console.log('FAIL', width, path, error.message.split('\n')[0]) }
    }
    await context.close()
    console.log(`Audited ${routes.length} routes at ${width}px`)
  }
  await writeFile(`${out}/results.json`, JSON.stringify({ dataset: 'Explicit empty public CMS/API fixtures; catalogue and learning content are real repository content.', rows }, null, 2))
  const failures = rows.filter(r => r.failure || r.overflow || r.brokenImages?.length || r.errors?.length)
  console.log(`${rows.length} route/viewport checks; ${failures.length} findings`)
  if (failures.length) process.exitCode = 1
} finally { await browser.close() }
