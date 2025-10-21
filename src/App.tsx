import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/auth-context'
import { ProtectedRoute } from './components/auth/protected-route'
import { MainLayout } from './components/layout/main-layout'
import { LoginPage } from './pages/auth/login'
import { AdminDashboard } from './pages/admin/dashboard'
import { AdminBookings } from './pages/admin/bookings'
import { AdminCustomers } from './pages/admin/customers'
import { AdminCustomerDetail } from './pages/admin/customer-detail'
import { AdminStaff } from './pages/admin/staff'
import { AdminStaffAvailability } from './pages/admin/staff-availability'
import { AdminServicePackages } from './pages/admin/service-packages'
import { AdminReports } from './pages/admin/reports'
import { AdminCalendar } from './pages/admin/calendar'
import { AdminChat } from './pages/admin/chat'
import { AdminTeams } from './pages/admin/teams'
import { StaffChat } from './pages/staff/chat'
import StaffDashboard from './pages/staff/dashboard'
import StaffCalendar from './pages/staff/calendar'
import StaffProfile from './pages/staff/profile'
import { Toaster } from './components/ui/toaster'

function App() {
  return (
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
            <Route path="staff-availability" element={<AdminStaffAvailability />} />
            <Route path="calendar" element={<AdminCalendar />} />
            <Route path="chat" element={<AdminChat />} />
            <Route path="packages" element={<AdminServicePackages />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="teams" element={<AdminTeams />} />
            <Route
              path="audit-log"
              element={
                <div className="text-center py-12">
                  <h2 className="text-2xl font-display font-bold text-tinedy-dark">
                    Audit Log
                  </h2>
                  <p className="text-muted-foreground mt-2">Coming soon...</p>
                </div>
              }
            />
            <Route
              path="settings"
              element={
                <div className="text-center py-12">
                  <h2 className="text-2xl font-display font-bold text-tinedy-dark">
                    Settings
                  </h2>
                  <p className="text-muted-foreground mt-2">Coming soon...</p>
                </div>
              }
            />
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
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  )
}

export default App
