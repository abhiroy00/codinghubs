import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth-context'
import { LenisProvider } from './lib/lenis-context'
import { ModalProvider } from './lib/modal-context'
import { Curriculum } from './pages/Curriculum'
import { FreeSession } from './pages/FreeSession'
import { NotFound } from './pages/NotFound'
import { LocationRoute } from './locations/LocationRoute'
import { LocationsIndex } from './locations/LocationsIndex'

const BlogList = lazy(() => import('./content-pages/BlogList').then((m) => ({ default: m.BlogList })))
const CaseList = lazy(() => import('./content-pages/CaseList').then((m) => ({ default: m.CaseList })))
const BlogDetail = lazy(() => import('./content-pages/Article').then((m) => ({ default: m.BlogDetail })))
const CaseDetail = lazy(() => import('./content-pages/Article').then((m) => ({ default: m.CaseDetail })))
const CatalogList = lazy(() => import('./shop-pages/catalog').then((m) => ({ default: m.CatalogList })))
const ProductDetail = lazy(() => import('./shop-pages/catalog').then((m) => ({ default: m.ProductDetail })))
const ProjectsPage = lazy(() => import('./shop-pages/projects').then((m) => ({ default: m.ProjectsPage })))
const ProjectPage = lazy(() => import('./shop-pages/projects').then((m) => ({ default: m.ProjectPage })))
const GuideDetail = lazy(() => import('./shop-pages/catalog').then((m) => ({ default: m.GuideDetail })))
const CartPage = lazy(() => import('./shop-pages/cart').then((m) => ({ default: m.CartPage })))
const CheckoutPage = lazy(() => import('./shop-pages/cart').then((m) => ({ default: m.CheckoutPage })))
const PaymentResult = lazy(() => import('./shop-pages/cart').then((m) => ({ default: m.PaymentResult })))
const MyAccount = lazy(() => import('./shop-pages/account').then((m) => ({ default: m.MyAccount })))
const MyOrders = lazy(() => import('./shop-pages/account').then((m) => ({ default: m.MyOrders })))
const MyDownloads = lazy(() => import('./shop-pages/account').then((m) => ({ default: m.MyDownloads })))
const Layout = lazy(() => import('./components/Layout').then((m) => ({ default: m.Layout })))
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute').then((m) => ({ default: m.ProtectedRoute })))
const CourseCheckout = lazy(() => import('./pages/CourseCheckout').then((m) => ({ default: m.CourseCheckout })))
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Faq = lazy(() => import('./pages/Faq').then((m) => ({ default: m.Faq })))
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const Policies = lazy(() => import('./pages/Policies').then((m) => ({ default: m.Policies })))
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })))
const BookTutor = lazy(() => import('./pages/BookTutor').then((m) => ({ default: m.BookTutor })))

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <LenisProvider>
          <ModalProvider>
            <Suspense fallback={null}>
<Routes>
              {/* Main page. Has its own header/footer, not the shared Layout chrome. */}
              <Route path="/" element={<FreeSession />} />
              <Route path="program/:slug" element={<Curriculum />} />
              <Route path="blog" element={<BlogList />} />
              <Route path="blog/:slug" element={<BlogDetail />} />
              <Route path="case-studies" element={<CaseList />} />
              <Route path="case-studies/:slug" element={<CaseDetail />} />
              <Route path="book-a-tutor" element={<BookTutor />} />
              <Route path="store" element={<CatalogList kind="store" />} />
              <Route path="store/:slug" element={<ProductDetail />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:slug" element={<ProjectPage />} />
              <Route path="project-guides" element={<CatalogList kind="guides" />} />
              <Route path="project-guides/:slug" element={<GuideDetail />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="payment/success" element={<PaymentResult />} />
              <Route path="payment/failure" element={<PaymentResult failed />} />
              <Route path="my-account" element={<MyAccount />} />
              <Route path="my-account/orders" element={<MyOrders />} />
              <Route path="my-account/downloads" element={<MyDownloads />} />
              <Route path="locations" element={<LocationsIndex />} />
              <Route path="locations/:slug" element={<LocationRoute />} />
              <Route element={<Layout />}>
                <Route path="faq" element={<Faq />} />
                <Route path="policies" element={<Policies />} />
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="courses/:slug" element={<CourseCheckout />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="dashboard" element={<Dashboard />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
</Suspense>
          </ModalProvider>
        </LenisProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}
