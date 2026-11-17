import { renderToString } from 'react-dom/server'
import { VisualLab } from './learning/VisualLab'
import { FAQ_META, Faq } from './pages/Faq'
import { OUR_WORK_META, OurWork } from './pages/our-work/OurWork'
import { AI_TOOLS_META, AiTools } from './pages/ai-tools/AiTools'
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
import { LatestJobs } from './pages/LatestJobs'
import { FreeSession } from './pages/FreeSession'
import { FIRST_SLIDE_PRELOAD } from './pages/free-session/hero-slides'
import { StudioLanding } from './studio/Landing'
import { NotFound } from './pages/NotFound'
import { LocationsIndex } from './locations/LocationsIndex'
import { LocationView } from './locations/LocationView'
import { INDEX_DESCRIPTION, INDEX_TITLE, indexJsonLd, locationJsonLd } from './locations/seo'
import { LOCATIONS, SITE_URL, locationPath } from './locations/registry'
import { learningMeta } from './seo/learning'
import { PREP_SOURCES } from './learning/prep-content'
import type { PrepGuide } from './learning/prep-content'
import { COURSE_CATALOG } from './learning/catalog'
import { CourseDetails, CourseDirectory, InterviewPrep } from './learning/CourseLearning'
import { LearnFrame } from './learning/LearnFrame'
import { GenAILearning } from './learning/GenAILearning'
import { CourseRoadmapLearning } from './learning/CourseRoadmapLearning'
import { COURSE_ROADMAPS,courseLevelPath,type CourseRoadmapData } from './learning/course-roadmap-content'
import { courseRoadmapMeta } from './learning/course-roadmap-seo'
import { genaiMeta } from './learning/genai-seo'
import { GENAI_LEVELS,genaiPath,type GenAILevel } from './learning/genai-content'
import type { LocationContent } from './locations/types'
import { HOME_META, LOGO_URL, NOT_FOUND_META, STUDIO_META, POLICIES_META, PROGRAM_METAS, TUTOR_META, JOBS_META, organizationNode } from './seo/site'

const contentModules = import.meta.glob<{ default: LocationContent }>('./locations/content/*.ts', { eager: true })

function renderLearningPage(path: string, element: ReactNode, trail?: { label: string; to?: string }[]) {
  // /courses/<slug>/ and /interview-prep/<slug>/ need a :slug param for useParams()
  const pattern = path.replace(/^(\/[^/]+)\/[^/]+\/?$/, '$1/:slug')
  return renderToString(
    <AuthProvider><StaticRouter location={path}><LenisProvider><ModalProvider><Routes><Route path={pattern} element={<LearnFrame trail={trail}>{element}</LearnFrame>} /></Routes></ModalProvider></LenisProvider></StaticRouter></AuthProvider>,
  )
}

const prepModules = import.meta.glob<{ default: PrepGuide }>('./learning/prep-generated/*.json', { eager: true })
const genaiModules = import.meta.glob<{default:GenAILevel}>('./learning/genai-generated/level-*.json',{eager:true})
const courseRoadmapModules = import.meta.glob<{default:CourseRoadmapData}>(['./learning/course-roadmaps/*.json','!./learning/course-roadmaps/manifest.json'],{eager:true})
export interface PrerenderedPage {
  /** File written under dist/ */
  file: string
  /** Public URL path (also used for the canonical and the sitemap) */
  path: string
  title: string
  description: string
  image: string
  indexable: boolean
  canonical?: string
  robots?: string
  /** true when the page uses the free-session design, so its stylesheet is linked statically in <head> */
  fsDesign: boolean
  html: string
  jsonLd?: unknown
  /** Images in the initial viewport to preload from <head> (srcset/sizes must equal the <img>'s). */
  preloadImages?: { imagesrcset: string; imagesizes: string }[]
}

export function renderAll(options: { skipMissing?: boolean } = {}): PrerenderedPage[] {
  const pages: PrerenderedPage[] = []
  pages.push({
    ...OUR_WORK_META, file: 'our-work.html', fsDesign: true,
    html: renderToString(<AuthProvider><StaticRouter location="/our-work"><LenisProvider><ModalProvider><OurWork /></ModalProvider></LenisProvider></StaticRouter></AuthProvider>),
  })
  pages.push({
    ...AI_TOOLS_META, file: 'ai-tools.html', fsDesign: true,
    html: renderToString(<AuthProvider><StaticRouter location="/ai-tools"><LenisProvider><ModalProvider><AiTools /></ModalProvider></LenisProvider></StaticRouter></AuthProvider>),
  })
  pages.push({ ...FAQ_META, file: 'faq.html', fsDesign: false, html: renderLearningPage('/faq', <Faq />, [{ label: 'FAQ' }]) })
  pages.push({file:'visual-lab/index.html',path:'/visual-lab/',title:'Interactive engineering visual lab | Coding Hubs',description:'Explore attention, vector similarity, gradient descent and engineering workflows with step-by-step controls.',image:LOGO_URL,indexable:true,fsDesign:false,html:renderLearningPage('/visual-lab/', <VisualLab />, [{label:'Visual lab'}]),jsonLd:{'@context':'https://schema.org','@graph':[organizationNode(),{'@type':'LearningResource',name:'Coding Hubs engineering visual lab',url:`${SITE_URL}/visual-lab/`,learningResourceType:'Interactive simulation'}]}})
  for(const course of Object.values(COURSE_ROADMAPS)) {
    const data=courseRoadmapModules[`./learning/course-roadmaps/${course.slug}.json`].default
    for(const level of course.levels) {
      const routes=[{suffix:'',article:undefined as string|undefined,day:undefined as number|undefined},...level.articles.map(a=>({suffix:`articles/${a.slug}/`,article:a.slug,day:undefined})),...level.days.map(d=>({suffix:`days/${d.day}/`,article:undefined,day:d.day}))]
      for(const route of routes) {
        const path=courseLevelPath(course.slug,level.level)+route.suffix
        const seo=courseRoadmapMeta(course.slug,level.level,route.article,route.day)
        const pattern='/interview-prep/:slug/levels/:level/'+(route.article?'articles/:article/':route.day?'days/:day/':'')
        pages.push({file:path.slice(1)+'index.html',path,title:seo.title,description:seo.description,image:LOGO_URL,indexable:seo.robots.startsWith('index'),canonical:seo.canonical,robots:seo.robots,fsDesign:true,jsonLd:seo.json_ld,
          html:renderToString(<AuthProvider><StaticRouter location={path}><LenisProvider><ModalProvider><Routes><Route path={pattern} element={<CourseRoadmapLearning initialData={data}/>}/></Routes></ModalProvider></LenisProvider></StaticRouter></AuthProvider>)})
      }
    }
  }
  for(const level of GENAI_LEVELS) {
    const data=genaiModules[`./learning/genai-generated/level-${level.level}.json`].default
    const routes=[{suffix:'',article:undefined as string|undefined,day:undefined as number|undefined},...level.articleSlugs.map(a=>({suffix:`articles/${a.slug}/`,article:a.slug,day:undefined})),...level.days.map(d=>({suffix:`days/${d.day}/`,article:undefined,day:d.day}))]
    for(const route of routes) {
      const path=genaiPath(level.level)+route.suffix
      const seo=genaiMeta(level.level,route.article,route.day)
      const pattern='/interview-prep/generative-ai/levels/:level/'+(route.article?'articles/:article/':route.day?'days/:day/':'')
      pages.push({file:path.slice(1)+'index.html',path,title:seo.title,description:seo.description,image:LOGO_URL,indexable:true,canonical:seo.canonical,robots:seo.robots,fsDesign:true,jsonLd:seo.json_ld,
        html:renderToString(<AuthProvider><StaticRouter location={path}><LenisProvider><ModalProvider><Routes><Route path={pattern} element={<GenAILearning initialData={data}/>}/></Routes></ModalProvider></LenisProvider></StaticRouter></AuthProvider>)})
    }
  }

  pages.push({ ...STUDIO_META, file: 'interview-studio/index.html', fsDesign: false,
    html: renderLearningPage('/interview-studio', <StudioLanding />, [{ label: 'Interview Studio' }]),
  })

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
    preloadImages: [FIRST_SLIDE_PRELOAD],
  })

  const learningPages = [
    { kind:'courses' as const, slug:undefined, element:<CourseDirectory /> },
    ...COURSE_CATALOG.flatMap(course => {
      const source = PREP_SOURCES[course.slug]
      const guide = source ? prepModules['./learning/prep-generated/' + source.curriculum + '.json']?.default : undefined
      return [
        { kind:'courses' as const, slug:course.slug, element:<CourseDetails /> },
        { kind:'interview-prep' as const, slug:course.slug, element:<InterviewPrep initialGuide={guide} /> },
      ]
    }),
    { kind:'interview-prep' as const, slug:undefined, element:<InterviewPrep /> },
  ]
  for (const item of learningPages) {
    const seo = learningMeta(item.kind, item.slug)
    const pagePath = '/' + item.kind + '/' + (item.slug ? item.slug + '/' : '')
    pages.push({
      file:pagePath.slice(1) + 'index.html', path:pagePath, title:seo.title, description:seo.description,
      image:seo.og.image, canonical:seo.canonical, robots:seo.robots, indexable:seo.robots.startsWith('index') && seo.canonical === SITE_URL + pagePath, fsDesign:true,
      html:renderLearningPage(pagePath, item.element), jsonLd:seo.json_ld,
    })
  }

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

  // Layout (global.css) pages. Policies is indexable, so its content is prerendered.
  pages.push({
    file: 'policies.html',
    path: POLICIES_META.path,
    title: POLICIES_META.title,
    description: POLICIES_META.description,
    image: POLICIES_META.image,
    indexable: POLICIES_META.indexable,
    fsDesign: false,
    jsonLd: POLICIES_META.jsonLd,
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
    file: 'latest-jobs/index.html',
    path: JOBS_META.path,
    title: JOBS_META.title,
    description: JOBS_META.description,
    image: JOBS_META.image,
    indexable: JOBS_META.indexable,
    fsDesign: true,
    html: renderToString(
      <AuthProvider>
        <StaticRouter location={JOBS_META.path}>
          <LatestJobs />
        </StaticRouter>
      </AuthProvider>,
    ),
    jsonLd: JOBS_META.jsonLd,
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
