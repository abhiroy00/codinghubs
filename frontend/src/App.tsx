import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './lib/auth-context'
import { LenisProvider } from './lib/lenis-context'
import { ModalProvider } from './lib/modal-context'
import { CourseCheckout } from './pages/CourseCheckout'
import { Dashboard } from './pages/Dashboard'
import { Faq } from './pages/Faq'
import { FreeSession } from './pages/FreeSession'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Policies } from './pages/Policies'
import { Register } from './pages/Register'

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <LenisProvider>
          <ModalProvider>
            <Routes>
              {/* Standalone: has its own header/footer, not the main site chrome. */}
              <Route path="free-session" element={<FreeSession />} />
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="faq" element={<Faq />} />
                <Route path="policies" element={<Policies />} />
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="courses/:slug" element={<CourseCheckout />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="dashboard" element={<Dashboard />} />
                </Route>
              </Route>
            </Routes>
          </ModalProvider>
        </LenisProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}
