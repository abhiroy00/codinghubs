import { lazy, Suspense } from 'react'
import { PrivateRouteMeta } from './seo/PrivateRouteMeta'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider } from './lib/auth-context'
import { ScrollManager } from './components/ScrollManager'
import { LenisProvider } from './lib/lenis-context'
import { ModalProvider } from './lib/modal-context'
import { RegisterPopupProvider } from './lib/register-popup'
import { FreeSession } from './pages/FreeSession'
import { NotFound } from './pages/NotFound'
import { LocationRoute } from './locations/LocationRoute'
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
const GuidesPage = lazy(() => import('./shop-pages/guides').then((m) => ({ default: m.GuidesPage })))
const GuidePage = lazy(() => import('./shop-pages/guides').then((m) => ({ default: m.GuidePage })))
const MyAccount = lazy(() => import('./shop-pages/account').then((m) => ({ default: m.MyAccount })))
const Layout = lazy(() => import('./components/Layout').then((m) => ({ default: m.Layout })))
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute').then((m) => ({ default: m.ProtectedRoute })))
const CourseCheckout = lazy(() => import('./pages/CourseCheckout').then((m) => ({ default: m.CourseCheckout })))
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const ForgotPassword = lazy(() => import('./pages/PasswordReset').then((m) => ({ default: m.ForgotPassword })))
const ResetPassword = lazy(() => import('./pages/PasswordReset').then((m) => ({ default: m.ResetPassword })))
const Policies = lazy(() => import('./pages/Policies').then((m) => ({ default: m.Policies })))
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })))
const BookTutor = lazy(() => import('./pages/BookTutor').then((m) => ({ default: m.BookTutor })))
const LatestJobs = lazy(() => import('./pages/LatestJobs').then((m) => ({ default: m.LatestJobs })))
const StudioApp = lazy(() => import('./studio/Studio').then((m) => ({ default: m.StudioApp })))

function CertificateRedirect() {
  const { slug = '' } = useParams()
  return <Navigate to={`/interview-prep/${slug}/#certificate`} replace />
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollManager />
        <PrivateRouteMeta />
        <LenisProvider>
          <ModalProvider>
            <RegisterPopupProvider>
            <Suspense fallback={null}>
<Routes>
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
              <Route path="project-guides" element={<GuidesPage />} />
              <Route path="project-guides/:slug" element={<GuidePage />} />
              <Route path="my-account" element={<MyAccount />} />
              <Route path="faq" element={<LearnFrame trail={[{ label: 'FAQ' }]}><Faq /></LearnFrame>} />
              <Route path="locations" element={<LocationsIndex />} />
              <Route path="locations/:slug" element={<LocationRoute />} />

                <Route path="courses" element={<LearnFrame><CourseDirectory /></LearnFrame>} />
                <Route path="courses/:slug" element={<LearnFrame><CourseDetails /></LearnFrame>} />
                <Route path="interview-prep" element={<LearnFrame><InterviewPrep /></LearnFrame>} />
                <Route path="interview-prep/:slug" element={<LearnFrame><InterviewPrep /></LearnFrame>} />
                <Route path="interview-prep/generative-ai/levels/:level" element={<GenAILearning />} />
                <Route path="interview-prep/generative-ai/levels/:level/articles/:article" element={<GenAILearning />} />
                <Route path="interview-prep/generative-ai/levels/:level/days/:day" element={<GenAILearning />} />
                <Route path="interview-prep/:slug/levels/:level" element={<CourseRoadmapLearning />} />
                <Route path="interview-prep/:slug/levels/:level/articles/:article" element={<CourseRoadmapLearning />} />
                <Route path="interview-prep/:slug/levels/:level/days/:day" element={<CourseRoadmapLearning />} />
                <Route path="ai" element={<AiHub />} />
                <Route path="ai/answer-evaluation" element={<AnswerEvaluation />} />
                <Route path="ai/mock-interview" element={<MockInterview />} />
                <Route path="ai/resume-analyzer" element={<ResumeAnalyzer />} />
                <Route path="ai/job-matcher" element={<JobMatcher />} />
                <Route path="certificates" element={<Navigate to="/interview-prep/#certificates" replace />} />
                <Route path="certificates/:slug" element={<CertificateRedirect />} />
              <Route element={<Layout />}>
                <Route path="policies" element={<Policies />} />
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="reset-password" element={<ResetPassword />} />
                <Route path="enroll/:slug" element={<CourseCheckout />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="dashboard" element={<Dashboard />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
</Suspense>
            </RegisterPopupProvider>
          </ModalProvider>
        </LenisProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}
