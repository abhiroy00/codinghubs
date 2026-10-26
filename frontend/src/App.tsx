import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './lib/auth-context'
import { LenisProvider } from './lib/lenis-context'
import { ModalProvider } from './lib/modal-context'
import { CourseCheckout } from './pages/CourseCheckout'
import { Curriculum } from './pages/Curriculum'
import { Dashboard } from './pages/Dashboard'
import { Faq } from './pages/Faq'
import { FreeSession } from './pages/FreeSession'
import { Login } from './pages/Login'
import { NotFound } from './pages/NotFound'
import { Policies } from './pages/Policies'
import { Register } from './pages/Register'
import { LocationRoute } from './locations/LocationRoute'
import { LocationsIndex } from './locations/LocationsIndex'

const AdminApp = lazy(() => import('./admin/AdminApp').then((m) => ({ default: m.AdminApp })))

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <LenisProvider>
          <ModalProvider>
            <Routes>
              {/* Main page. Has its own header/footer, not the shared Layout chrome. */}
              <Route path="/" element={<FreeSession />} />
              <Route path="program/:slug" element={<Curriculum />} />
              <Route
                path="admin-panel/*"
                element={
                  <Suspense fallback={null}>
                    <AdminApp />
                  </Suspense>
                }
              />
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
          </ModalProvider>
        </LenisProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}
