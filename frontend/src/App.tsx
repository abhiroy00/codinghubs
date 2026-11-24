import { lazy, Suspense } from 'react'
import { PrivateRouteMeta } from './seo/PrivateRouteMeta'
import { BrowserRouter, Navigate, Route, Routes, useParams, useLocation } from 'react-router-dom'
import { AuthProvider } from './lib/auth-context'
import { ScrollManager } from './components/ScrollManager'
import { OfferCampaign } from './components/OfferCampaign'
import { LenisProvider } from './lib/lenis-context'
import { ModalProvider } from './lib/modal-context'
import { RegisterPopupProvider } from './lib/register-popup'
import { FreeSession } from './pages/FreeSession'
import { NotFound } from './pages/NotFound'
import { LocationRoute } from './locations/LocationRoute'
const Newsletter = lazy(() => import('./community/Newsletter').then(m => ({default:m.Newsletter})))
const NewsletterIssue = lazy(() => import('./community/Newsletter').then(m => ({default:m.NewsletterIssue})))
const NewsletterAction = lazy(() => import('./community/Newsletter').then(m => ({default:m.NewsletterAction})))
const Brochures = lazy(() => import('./community/Brochures').then(m => ({default:m.Brochures})))
const InterviewHub = lazy(() => import('./interview/InterviewHub').then(m=>({default:m.InterviewHub})))
const InterviewGuide = lazy(() => import('./interview/InterviewGuide').then(m=>({default:m.InterviewGuide})))
const LearnFrame = lazy(() => import('./learning/LearnFrame').then(m => ({ default: m.LearnFrame })))
const Academy = lazy(() => import('./learning/Academy').then(m => ({ default: m.Academy })))
const Learning = lazy(() => import('./learning/Learning').then(m => ({ default: m.Learning })))
const VisualLab = lazy(() => import('./learning/VisualLab').then(m => ({ default: m.VisualLab })))
const Faq = lazy(() => import('./pages/Faq').then(m => ({ default: m.Faq })))

const GigsPage = lazy(() => import('./gigs/GigsPage').then(m => ({ default: m.GigsPage })))
const Curriculum = lazy(() => import('./pages/Curriculum').then((m) => ({ default: m.Curriculum })))
const LocationsIndex = lazy(() => import('./locations/LocationsIndex').then((m) => ({ default: m.LocationsIndex })))
const CourseDirectory = lazy(() => import('./learning/CourseLearning').then((m) => ({ default: m.CourseDirectory })))
const CourseDetails = lazy(() => import('./learning/CourseLearning').then((m) => ({ default: m.CourseDetails })))
const InterviewPrep = lazy(() => import('./learning/CourseLearning').then((m) => ({ default: m.InterviewPrep })))
const GenAILearning = lazy(() => import('./learning/GenAILearning').then(m => ({default:m.GenAILearning})))
const CourseRoadmapLearning = lazy(() => import('./learning/CourseRoadmapLearning').then(m => ({default:m.CourseRoadmapLearning})))
const AiHub = lazy(() => import('./ai/AiHub').then((m) => ({ default: m.AiHub })))
const AnswerEvaluation = lazy(() => import('./ai/AnswerEvaluation').then((m) => ({ default: m.AnswerEvaluation })))
const MockInterview = lazy(() => import('./ai/MockInterview').then((m) => ({ default: m.MockInterview })))
const ResumeAnalyzer = lazy(() => import('./ai/ResumeAnalyzer').then((m) => ({ default: m.ResumeAnalyzer })))
const JobMatcher = lazy(() => import('./ai/JobMatcher').then((m) => ({ default: m.JobMatcher })))
const BlogList = lazy(() => import('./content-pages/BlogList').then((m) => ({ default: m.BlogList })))
const CaseList = lazy(() => import('./content-pages/CaseList').then((m) => ({ default: m.CaseList })))
const BlogDetail = lazy(() => import('./content-pages/Article').then((m) => ({ default: m.BlogDetail })))
const CaseDetail = lazy(() => import('./content-pages/Article').then((m) => ({ default: m.CaseDetail })))
const ProjectsPage = lazy(() => import('./shop-pages/projects').then((m) => ({ default: m.ProjectsPage })))
const ProjectPage = lazy(() => import('./shop-pages/projects').then((m) => ({ default: m.ProjectPage })))
const DemoVideosPage = lazy(() => import('./pages/demo-videos/DemoVideosPage').then((m) => ({ default: m.DemoVideosPage })))
const AiTools = lazy(() => import('./pages/ai-tools/AiTools').then((m) => ({ default: m.AiTools })))
const OurWork = lazy(() => import('./pages/our-work/OurWork').then((m) => ({ default: m.OurWork })))
const GuidesPage = lazy(() => import('./shop-pages/guides').then((m) => ({ default: m.GuidesPage })))
const GuidePage = lazy(() => import('./shop-pages/guides').then((m) => ({ default: m.GuidePage })))
const MyAccount = lazy(() => import('./shop-pages/account').then((m) => ({ default: m.MyAccount })))
const Layout = lazy(() => import('./components/Layout').then((m) => ({ default: m.Layout })))
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute').then((m) => ({ default: m.ProtectedRoute })))
const CourseCheckout = lazy(() => import('./pages/CourseCheckout').then((m) => ({ default: m.CourseCheckout })))
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const ForgotPassword = lazy(() => import('./pages/PasswordReset').then((m) => ({ default: m.ForgotPassword })))
const ResetPassword = lazy(() => import('./pages/PasswordReset').then((m) => ({ default: m.ResetPassword })))
const Policies = lazy(() => import('./pages/Policies').then((m) => ({ default: m.Policies })))
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })))
const BookTutor = lazy(() => import('./pages/BookTutor').then((m) => ({ default: m.BookTutor })))
const LatestJobs = lazy(() => import('./pages/LatestJobs').then((m) => ({ default: m.LatestJobs })))
const Certificates = lazy(() => import('./pages/Certificates').then((m) => ({ default: m.Certificates })))
const CertificateVerify = lazy(() => import('./pages/CertificateVerify').then((m) => ({ default: m.CertificateVerify })))
const StudioApp = lazy(() => import('./studio/Studio').then((m) => ({ default: m.StudioApp })))

function LegacyInterviewRedirect(){const location=useLocation();return <Navigate to={location.pathname.replace(/^\/interview-prep(?=\/|$)/,'/interview')+location.search+location.hash} replace/>}

function DashboardRedirect(){const location=useLocation();const params=new URLSearchParams(location.search);params.set('section','learning');return <Navigate to={'/my-account?'+params.toString()+location.hash} replace/>}

function CertificateRedirect() {
  const { slug = '' } = useParams()
  return <Navigate to={`/interview/${slug}/#certificate`} replace />
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  )
}

/** Keep the homepage's server and client trees identical so React can reuse its HTML. */
export function AppContent() {
  return (
    <>
        <ScrollManager />
        <PrivateRouteMeta />
        <LenisProvider>
          <ModalProvider>
            <RegisterPopupProvider>
            <OfferCampaign />
            <Suspense fallback={null}>
<Routes>
<Route path="interview-prep/*" element={<LegacyInterviewRedirect/>}/>
<Route path="newsletter" element={<Newsletter/>}/><Route path="newsletter/issues/:slug" element={<NewsletterIssue/>}/><Route path="newsletter/confirm" element={<NewsletterAction action="confirm"/>}/><Route path="newsletter/unsubscribe" element={<NewsletterAction action="unsubscribe"/>}/><Route path="brochures" element={<Brochures/>}/>
              <Route path="learn" element={<LearnFrame trail={[{ label: 'Learning library' }]}><Academy /></LearnFrame>} />
              <Route path="learn/:course" element={<Learning />} />
              <Route path="learn/:course/:slug" element={<Learning />} />
              <Route path="visual-lab" element={<LearnFrame trail={[{ label: 'Visual lab' }]}><VisualLab /></LearnFrame>} />
              {/* Main page. Has its own header/footer, not the shared Layout chrome. */}
              <Route path="/" element={<FreeSession />} />
              <Route path="interview-studio/*" element={<LearnFrame trail={[{ label: 'Interview Studio' }]}><StudioApp /></LearnFrame>} />
              <Route path="program/:slug" element={<Curriculum />} />
              <Route path="gigs" element={<GigsPage />} />
              <Route element={<ProtectedRoute />}><Route path="gigs/workspace" element={<GigsPage workspace />} /></Route>
              <Route path="gigs/:slug" element={<GigsPage />} />
              <Route path="blog" element={<BlogList />} />
              <Route path="blog/:slug" element={<BlogDetail />} />
              <Route path="case-studies" element={<CaseList />} />
              <Route path="case-studies/:slug" element={<CaseDetail />} />
              <Route path="book-a-tutor" element={<BookTutor />} />
              <Route path="book-a-tutor/:tutorId" element={<BookTutor />} />
              <Route path="latest-jobs" element={<LatestJobs />} />
              <Route path="latest-jobs/:slug" element={<LatestJobs />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:slug" element={<ProjectPage />} />
              <Route path="our-work" element={<OurWork />} />
              <Route path="ai-tools" element={<AiTools />} />
              <Route path="demo-videos" element={<DemoVideosPage />} />
              <Route path="project-guides" element={<GuidesPage />} />
              <Route path="project-guides/:slug" element={<GuidePage />} />
              <Route path="my-account" element={<MyAccount />} />
              <Route element={<ProtectedRoute />}><Route path="dashboard" element={<DashboardRedirect />} /></Route>
              <Route path="faq" element={<LearnFrame trail={[{ label: 'FAQ' }]}><Faq /></LearnFrame>} />
              <Route path="locations" element={<LocationsIndex />} />
              <Route path="locations/:slug" element={<LocationRoute />} />

                <Route path="courses" element={<LearnFrame><CourseDirectory /></LearnFrame>} />
                <Route path="courses/:slug" element={<LearnFrame><CourseDetails /></LearnFrame>} />
                <Route path="interview" element={<LearnFrame><InterviewHub /></LearnFrame>} />
                <Route path="interview/guides/:slug" element={<InterviewGuide/>} />
                <Route path="interview/:slug" element={<LearnFrame><InterviewPrep /></LearnFrame>} />
                <Route path="interview/generative-ai/levels/:level" element={<GenAILearning />} />
                <Route path="interview/generative-ai/levels/:level/articles/:article" element={<GenAILearning />} />
                <Route path="interview/generative-ai/levels/:level/days/:day" element={<GenAILearning />} />
                <Route path="interview/:slug/levels/:level" element={<CourseRoadmapLearning />} />
                <Route path="interview/:slug/levels/:level/articles/:article" element={<CourseRoadmapLearning />} />
                <Route path="interview/:slug/levels/:level/days/:day" element={<CourseRoadmapLearning />} />
                <Route path="ai" element={<AiHub />} />
                <Route path="ai/answer-evaluation" element={<AnswerEvaluation />} />
                <Route path="ai/mock-interview" element={<MockInterview />} />
                <Route path="ai/resume-analyzer" element={<ResumeAnalyzer />} />
                <Route path="ai/job-matcher" element={<JobMatcher />} />
                <Route path="certificates" element={<Certificates />} />
                <Route path="certificates/verify" element={<CertificateVerify />} />
                <Route path="certificates/:slug" element={<CertificateRedirect />} />
              <Route element={<Layout />}>
                <Route path="policies" element={<Policies />} />
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="reset-password" element={<ResetPassword />} />
                <Route path="enroll/:slug" element={<CourseCheckout />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
</Suspense>
            </RegisterPopupProvider>
          </ModalProvider>
        </LenisProvider>
    </>
  )
}
