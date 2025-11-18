import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { AuthProvider } from './contexts/auth-context'
import { ThemeProvider } from './components/theme-provider'
import { ProtectedRoute } from './components/auth/protected-route'
import { RoleBasedRedirect } from './components/auth/role-based-redirect'
import { MainLayout } from './components/layout/main-layout'
import { Toaster } from './components/ui/toaster'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PUBLIC_ROUTES, ADMIN_ROUTES, STAFF_ROUTES } from './config/routes'

// Eager load: Login page (first page users see)
import { LoginPage } from './pages/auth/login'

// Lazy load: Admin pages (only load when accessed)
const AdminDashboard = lazy(() => import('./pages/admin/dashboard').then(m => ({ default: m.AdminDashboard })))
const AdminBookings = lazy(() => import('./pages/admin/bookings').then(m => ({ default: m.AdminBookings })))
const AdminCustomers = lazy(() => import('./pages/admin/customers').then(m => ({ default: m.AdminCustomers })))
const AdminCustomerDetail = lazy(() => import('./pages/admin/customer-detail').then(m => ({ default: m.AdminCustomerDetail })))
const AdminStaff = lazy(() => import('./pages/admin/staff').then(m => ({ default: m.AdminStaff })))
const AdminStaffPerformance = lazy(() => import('./pages/admin/staff-performance').then(m => ({ default: m.AdminStaffPerformance })))
const AdminWeeklySchedule = lazy(() => import('./pages/admin/weekly-schedule').then(m => ({ default: m.AdminWeeklySchedule })))
const AdminServicePackages = lazy(() => import('./pages/admin/service-packages').then(m => ({ default: m.AdminServicePackages })))
const AdminPackageDetail = lazy(() => import('./pages/admin/package-detail'))
const AdminReports = lazy(() => import('./pages/admin/reports').then(m => ({ default: m.AdminReports })))
const AdminCalendar = lazy(() => import('./pages/admin/calendar').then(m => ({ default: m.AdminCalendar })))
const AdminChat = lazy(() => import('./pages/admin/chat').then(m => ({ default: m.AdminChat })))
const AdminTeams = lazy(() => import('./pages/admin/teams').then(m => ({ default: m.AdminTeams })))
const AdminTeamDetail = lazy(() => import('./pages/admin/team-detail').then(m => ({ default: m.AdminTeamDetail })))
const AdminProfile = lazy(() => import('./pages/admin/profile'))
const AdminSettings = lazy(() => import('./pages/admin/settings'))

// Lazy load: Staff pages (only load when accessed)
const StaffDashboard = lazy(() => import('./pages/staff/dashboard'))
const StaffCalendar = lazy(() => import('./pages/staff/calendar'))
const StaffChat = lazy(() => import('./pages/staff/chat').then(m => ({ default: m.StaffChat })))
const StaffProfile = lazy(() => import('./pages/staff/profile'))

// Lazy load: Payment pages (public access)
const PaymentPage = lazy(() => import('./pages/payment/payment').then(m => ({ default: m.PaymentPage })))
const PaymentSuccessPage = lazy(() => import('./pages/payment/payment-success').then(m => ({ default: m.PaymentSuccessPage })))

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
)

// 403 Unauthorized Page Component
function UnauthorizedPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-tinedy-blue via-tinedy-green to-tinedy-yellow">
      <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
        <h1 className="text-4xl font-display font-bold text-tinedy-dark">
          403
        </h1>
        <p className="text-lg font-semibold text-tinedy-dark mt-4">Unauthorized</p>
        <p className="text-muted-foreground mt-2">
          You do not have permission to access this page
        </p>
        <button
          onClick={() => navigate('/login')}
          className="mt-6 px-6 py-2 bg-tinedy-blue text-white rounded-lg hover:bg-tinedy-blue/90 transition-colors"
        >
          Go to Login
        </button>
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="tinedy-crm-theme">
      <AuthProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
            {/* Public routes */}
            <Route path={PUBLIC_ROUTES.LOGIN.path} element={<LoginPage />} />

            {/* Payment routes (public - no auth required) */}
            <Route path={PUBLIC_ROUTES.PAYMENT.path} element={<PaymentPage />} />
            <Route path={PUBLIC_ROUTES.PAYMENT_SUCCESS.path} element={<PaymentSuccessPage />} />

            {/* Protected Admin routes (includes Manager access) */}
            <Route
              path={ADMIN_ROUTES.ADMIN_DASHBOARD.path}
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROUTES.ADMIN_DASHBOARD.allowedRoles}>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="customers/:id" element={<AdminCustomerDetail />} />
              <Route path="staff" element={<AdminStaff />} />
              <Route path="staff/:id" element={<AdminStaffPerformance />} />
              <Route path="weekly-schedule" element={<AdminWeeklySchedule />} />
              <Route path="calendar" element={<AdminCalendar />} />
              <Route path="chat" element={<AdminChat />} />
              <Route path="packages" element={<AdminServicePackages />} />
              <Route path="packages/:packageId" element={<AdminPackageDetail />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="teams" element={<AdminTeams />} />
              <Route path="teams/:teamId" element={<AdminTeamDetail />} />
              <Route path="profile" element={<AdminProfile />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Protected Staff routes */}
            <Route
              path={STAFF_ROUTES.STAFF_DASHBOARD.path}
              element={
                <ProtectedRoute allowedRoles={STAFF_ROUTES.STAFF_DASHBOARD.allowedRoles}>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<StaffDashboard />} />
              <Route path="calendar" element={<StaffCalendar />} />
              <Route path="chat" element={<StaffChat />} />
              <Route path="profile" element={<StaffProfile />} />
            </Route>

          {/* Redirect root based on user role */}
          <Route path="/" element={<RoleBasedRedirect />} />

          {/* Unauthorized */}
          <Route path={PUBLIC_ROUTES.UNAUTHORIZED.path} element={<UnauthorizedPage />} />

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-tinedy-off-white">
                <div className="text-center">
                  <h1 className="text-4xl font-display font-bold text-tinedy-dark">
                    404
                  </h1>
                  <p className="text-muted-foreground mt-2">Page not found</p>
                </div>
              </div>
            }
          />
              </Routes>
            </Suspense>
            <Toaster />
          </BrowserRouter>
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
