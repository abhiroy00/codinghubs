import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { App } from './App'
import { loadContent } from './locations/content-loader'
// Self-hosted fonts first (index CSS, so every page has them, including the prerendered ones before JS runs).
import './styles/fonts.css'
import './styles/global.css'
import { loadPrepGuide } from './learning/prep-content'
import { loadGenAILevel } from './learning/genai-content'
import { prefetchRoutesWhenIdle } from './lib/prefetch'

async function start() {
  // On a location page, load that locality's article before the first render so the
  // prerendered content is replaced by identical content instead of a blank flash.
  const m = window.location.pathname.match(/^\/locations\/([^/]+)\/?$/)
  if (m) await loadContent(m[1]).catch(() => null)
  // Blog / case-study pages are lazy chunks: load theirs first so the server-rendered page is replaced without a blank flash.
  const c = window.location.pathname.match(/^\/(blog|case-studies)(\/|$)/)
  if (c) await (c[1] === 'blog' ? import('./content-pages/BlogList') : import('./content-pages/CaseList')).catch(() => null)
  if (c && window.location.pathname.split('/').filter(Boolean).length > 1) await import('./content-pages/Article').catch(() => null)
  // Projects / guides pages are lazy chunks too: load theirs first so the server-rendered page is replaced without a flash.
  const sp = window.location.pathname.match(/^\/(projects|project-guides)(\/|$)/)
  if (sp) await Promise.all([import('./shop-pages/catalog'), sp[1] === 'projects' ? import('./shop-pages/projects') : import('./shop-pages/guides')]).catch(() => null)
  // Program, courses, interview prep and the locations index are lazy chunks as well.
  const path = window.location.pathname
  if (/^\/book-a-tutor(?:\/|$)/.test(path)) await import('./pages/BookTutor').catch(() => null)
  if (/^\/latest-jobs(?:\/|$)/.test(path)) await import('./pages/LatestJobs').catch(() => null)
  if (/^\/interview-studio(\/|$)/.test(path)) await import('./studio/Studio').catch(() => null)
  if (/^\/interview\/guides\//.test(path)) await import('./interview/InterviewGuide').catch(()=>null)
  if (/^\/interview\/?$/.test(path)) await import('./interview/InterviewHub').catch(()=>null)
  if (/^\/newsletter(?:\/|$)/.test(path)) await import('./community/Newsletter').catch(()=>null)
  if (/^\/brochures(?:\/|$)/.test(path)) await import('./community/Brochures').catch(()=>null)
  const lazyPage = /^\/program\//.test(path) ? import('./pages/Curriculum')
    : /^\/visual-lab\/?$/.test(path) ? import('./learning/VisualLab')
    : /^\/learn\/?$/.test(path) ? import('./learning/Academy')
    : /^\/learn\//.test(path) ? import('./learning/Learning')
    : (/^\/courses(?:\/|$)/.test(path) || /^\/interview\/(?!guides\/).+/.test(path)) ? import('./learning/CourseLearning')
    : /^\/locations\/?$/.test(path) ? import('./locations/LocationsIndex')
    : null
  // Lazy route wrappers too: if the first render has to wait for one, React commits the empty Suspense fallback
  // over the prerendered page (a blank flash, a layout shift and a late LCP) until the chunk arrives.
  const wrapper = /^\/(learn|visual-lab|interview-studio|faq|courses)(\/|$)/.test(path) || (/^\/interview(\/|$)/.test(path) && !/\/levels\//.test(path))
    ? import('./learning/LearnFrame')
    : /^\/(policies|login|register|forgot-password|reset-password|enroll)(\/|$)/.test(path) ? import('./components/Layout')
    : null
  await Promise.all([lazyPage, wrapper].map((p) => p?.catch(() => null)))
  const prep = path.match(/^\/interview\/([^/]+)\/?$/)
  const genai = path.match(/^\/interview\/generative-ai\/levels\/(\d+)(\/|$)/)
  if(genai) await Promise.all([import('./learning/GenAILearning'),loadGenAILevel(Number(genai[1]))]).catch(()=>null)
  const subject=path.match(/^\/interview\/([^/]+)\/levels\//)
  if(subject&&subject[1]!=='generative-ai') await Promise.all([import('./learning/CourseRoadmapLearning'),import('./learning/course-roadmap-content').then(m=>m.loadCourseRoadmap(subject[1]))]).catch(()=>null)
  if (prep) await loadPrepGuide(prep[1]).catch(() => null)
  prefetchRoutesWhenIdle()
  const root = document.getElementById('root')!
  const app = (
    <StrictMode>
      <App />
    </StrictMode>
  )
  if (path === '/' && root.hasChildNodes()) hydrateRoot(root, app)
  else createRoot(root).render(app)
}

void start()
