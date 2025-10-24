import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/auth-context'
import { ThemeProvider } from './components/theme-provider'
import { ProtectedRoute } from './components/auth/protected-route'
import { MainLayout } from './components/layout/main-layout'
import { LoginPage } from './pages/auth/login'
import { AdminDashboard } from './pages/admin/dashboard'
import { AdminBookings } from './pages/admin/bookings'
import { AdminCustomers } from './pages/admin/customers'
import { AdminCustomerDetail } from './pages/admin/customer-detail'
import { AdminStaff } from './pages/admin/staff'
import { AdminStaffPerformance } from './pages/admin/staff-performance'
import { AdminStaffAvailability } from './pages/admin/staff-availability'
import { AdminServicePackages } from './pages/admin/service-packages'
import { AdminReports } from './pages/admin/reports'
import { AdminCalendar } from './pages/admin/calendar'
import { AdminChat } from './pages/admin/chat'
import { AdminTeams } from './pages/admin/teams'
import AdminProfile from './pages/admin/profile'
import AdminSettings from './pages/admin/settings'
import { StaffChat } from './pages/staff/chat'
import StaffDashboard from './pages/staff/dashboard'
import StaffCalendar from './pages/staff/calendar'
import StaffProfile from './pages/staff/profile'
import { Toaster } from './components/ui/toaster'

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="tinedy-crm-theme">
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
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
            <Route path="staff-availability" element={<AdminStaffAvailability />} />
            <Route path="calendar" element={<AdminCalendar />} />
            <Route path="chat" element={<AdminChat />} />
            <Route path="packages" element={<AdminServicePackages />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="teams" element={<AdminTeams />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Protected Staff routes */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StaffDashboard />} />
            <Route path="calendar" element={<StaffCalendar />} />
            <Route path="chat" element={<StaffChat />} />
            <Route path="profile" element={<StaffProfile />} />
          </Route>

          {/* Redirect root to admin dashboard */}
          <Route path="/" element={<Navigate to="/admin" replace />} />

          {/* Unauthorized */}
          <Route
            path="/unauthorized"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-tinedy-blue via-tinedy-green to-tinedy-yellow">
                <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
                  <h1 className="text-4xl font-display font-bold text-tinedy-dark">
                    403
                  </h1>
                  <p className="text-lg font-semibold text-tinedy-dark mt-4">Unauthorized</p>
                  <p className="text-muted-foreground mt-2">
                    You don't have permission to access this page
                  </p>
                  <button
                    onClick={() => window.location.href = '/login'}
                    className="mt-6 px-6 py-2 bg-tinedy-blue text-white rounded-lg hover:bg-tinedy-blue/90 transition-colors"
                  >
                    Go to Login
                  </button>
                </div>
              </div>
            }
          />

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
        <Toaster />
      </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
