import { renderToString } from 'react-dom/server'
import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Policies } from './pages/Policies'
import { AuthProvider } from './lib/auth-context'
import { LenisProvider } from './lib/lenis-context'
import { ModalProvider } from './lib/modal-context'
import { StaticRouter } from 'react-router-dom'
import { Curriculum } from './pages/Curriculum'
import { BookTutor } from './pages/BookTutor'
import { FreeSession } from './pages/FreeSession'
import { NotFound } from './pages/NotFound'
import { LocationsIndex } from './locations/LocationsIndex'
import { LocationView } from './locations/LocationView'
import { INDEX_DESCRIPTION, INDEX_TITLE, indexJsonLd, locationJsonLd } from './locations/seo'
import { LOCATIONS, SITE_URL, locationPath } from './locations/registry'
import { COURSE_CATALOG } from './learning/catalog'
import { CourseDetails, CourseDirectory, InterviewPrep } from './learning/CourseLearning'
import { CertificatesPage } from './learning/Certificates'
import type { LocationContent } from './locations/types'
import { CERTIFICATES_META, FAQ_META, HOME_META, LOGO_URL, NOT_FOUND_META, POLICIES_META, PROGRAM_METAS, TUTOR_META } from './seo/site'

const contentModules = import.meta.glob<{ default: LocationContent }>('./locations/content/*.ts', { eager: true })

function renderLearningPage(path: string, element: ReactNode) {
  return renderToString(
    <AuthProvider><StaticRouter location={path}><LenisProvider><ModalProvider><Routes><Route element={<Layout />}><Route path={path} element={element} /></Route></Routes></ModalProvider></LenisProvider></StaticRouter></AuthProvider>,
  )
}

export interface PrerenderedPage {
  /** File written under dist/ */
  file: string
  /** Public URL path (also used for the canonical and the sitemap) */
  path: string
  title: string
  description: string
  image: string
  indexable: boolean
  /** true when the page uses the free-session design, so its stylesheet is linked statically in <head> */
  fsDesign: boolean
  html: string
  jsonLd?: unknown
}

export function renderAll(options: { skipMissing?: boolean } = {}): PrerenderedPage[] {
  const pages: PrerenderedPage[] = []

  pages.push({
    file: 'home.html',
    path: '/',
    title: HOME_META.title,
    description: HOME_META.description,
    image: HOME_META.image,
    indexable: true,
    fsDesign: true,
    html: renderToString(
      <AuthProvider>
        <StaticRouter location="/">
          <FreeSession />
        </StaticRouter>
      </AuthProvider>,
    ),
    jsonLd: HOME_META.jsonLd,
  })

  pages.push({
    file: 'courses/index.html', path: '/courses/', title: 'Courses | Coding Hubs School of AI',
    description: 'Explore the Coding Hubs School of AI course catalog and course-specific learning paths.',
    image: LOGO_URL, indexable: true, fsDesign: false,
    html: renderLearningPage('/courses', <CourseDirectory />),
  })
  for (const course of COURSE_CATALOG) {
    const path = `/courses/${course.slug}/`
    pages.push({
      file: `courses/${course.slug}/index.html`, path, title: `${course.name} Course | Coding Hubs`,
      description: course.summary, image: LOGO_URL, indexable: true, fsDesign: false,
      html: renderLearningPage(path, <CourseDetails />),
    })
    const prepPath = `/interview-prep/${course.slug}/`
    pages.push({
      file: `interview-prep/${course.slug}/index.html`, path: prepPath, title: `${course.name}: 30-Day Prep | Coding Hubs`,
      description: `A 30-day ${course.name} interview preparation roadmap with daily theory, questions, quizzes and practical challenges.`,
      image: LOGO_URL, indexable: true, fsDesign: false,
      html: renderLearningPage(prepPath, <InterviewPrep />),
    })
  }
  pages.push({
    file: 'interview-prep/index.html', path: '/interview-prep/', title: 'Interview Preparation Dashboard | Coding Hubs School of AI',
    description: 'Choose a course-specific 30-day roadmap and track your daily interview preparation progress.',
    image: LOGO_URL, indexable: true, fsDesign: false,
    html: renderLearningPage('/interview-prep', <InterviewPrep />),
  })

  pages.push({
    file: 'certificates/index.html', path: '/certificates/', title: CERTIFICATES_META.title,
    description: CERTIFICATES_META.description, image: CERTIFICATES_META.image, indexable: CERTIFICATES_META.indexable, fsDesign: false,
    html: renderLearningPage('/certificates/', <CertificatesPage />),
    jsonLd: CERTIFICATES_META.jsonLd,
  })

  for (const meta of PROGRAM_METAS) {
    pages.push({
      file: `${meta.path.slice(1)}.html`,
      path: meta.path,
      title: meta.title,
      description: meta.description,
      image: meta.image,
      indexable: true,
      fsDesign: true,
      html: renderToString(
      <AuthProvider>
        <StaticRouter location={meta.path}>
          <Routes>
            <Route path="program/:slug" element={<Curriculum />} />
          </Routes>
        </StaticRouter>
      </AuthProvider>,
      ),
      jsonLd: meta.jsonLd,
    })
  }

  // Layout (global.css) pages. Policies is indexable, so its content is prerendered; the FAQ stays noindex (metadata only) until reviewed.
  pages.push({ file: 'faq.html', path: FAQ_META.path, title: FAQ_META.title, description: FAQ_META.description, image: FAQ_META.image, indexable: FAQ_META.indexable, fsDesign: false, html: '' })
  pages.push({
    file: 'policies.html',
    path: POLICIES_META.path,
    title: POLICIES_META.title,
    description: POLICIES_META.description,
    image: POLICIES_META.image,
    indexable: POLICIES_META.indexable,
    fsDesign: false,
    html: renderToString(
      <AuthProvider>
        <StaticRouter location="/policies">
          <LenisProvider>
            <ModalProvider>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="policies" element={<Policies />} />
                </Route>
              </Routes>
            </ModalProvider>
          </LenisProvider>
        </StaticRouter>
      </AuthProvider>,
    ),
  })

  pages.push({
    file: 'book-a-tutor/index.html',
    path: TUTOR_META.path,
    title: TUTOR_META.title,
    description: TUTOR_META.description,
    image: TUTOR_META.image,
    indexable: TUTOR_META.indexable,
    fsDesign: true,
    html: renderToString(
      <AuthProvider>
        <StaticRouter location={TUTOR_META.path}>
          <BookTutor />
        </StaticRouter>
      </AuthProvider>,
    ),
    jsonLd: TUTOR_META.jsonLd,
  })

  pages.push({
    file: 'locations/index.html',
    path: '/locations/',
    title: INDEX_TITLE,
    description: INDEX_DESCRIPTION,
    image: LOGO_URL,
    indexable: true,
    fsDesign: true,
    html: renderToString(
      <AuthProvider>
        <StaticRouter location="/locations/">
          <LocationsIndex />
        </StaticRouter>
      </AuthProvider>,
    ),
    jsonLd: indexJsonLd(),
  })

  for (const meta of LOCATIONS) {
    const mod = contentModules[`./locations/content/${meta.slug}.ts`]
    if (!mod) {
      if (options.skipMissing) continue
      throw new Error(`Missing content module for ${meta.slug}`)
    }
    const content = mod.default
    pages.push({
      file: `locations/${meta.slug}/index.html`,
      path: locationPath(meta.slug),
      title: content.metaTitle,
      description: content.metaDescription,
      image: `${SITE_URL}/assets/ai/loc/${meta.slug}.jpg`,
      indexable: true,
      fsDesign: true,
      html: renderToString(
        <AuthProvider>
          <StaticRouter location={locationPath(meta.slug)}>
            <LocationView meta={meta} content={content} />
          </StaticRouter>
        </AuthProvider>,
      ),
      jsonLd: locationJsonLd(meta, content),
    })
  }

  pages.push({
    file: '404.html',
    path: NOT_FOUND_META.path,
    title: NOT_FOUND_META.title,
    description: NOT_FOUND_META.description,
    image: NOT_FOUND_META.image,
    indexable: false,
    fsDesign: true,
    html: renderToString(
      <AuthProvider>
        <StaticRouter location="/404">
          <NotFound />
        </StaticRouter>
      </AuthProvider>,
    ),
  })

  return pages
}
