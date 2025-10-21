import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('admin' | 'staff')[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  // Debug logging
  console.log('[ProtectedRoute] State:', {
    loading,
    hasUser: !!user,
    hasProfile: !!profile,
    profileRole: profile?.role,
    allowedRoles,
    currentPath: location.pathname
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-tinedy-off-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tinedy-blue mx-auto mb-4"></div>
          <p className="text-tinedy-blue font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    console.log('[ProtectedRoute] Redirecting to login: no user or profile')
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    console.log('[ProtectedRoute] Redirecting to unauthorized: role mismatch')
    return <Navigate to="/unauthorized" replace />
  }

  console.log('[ProtectedRoute] Access granted')
  return <>{children}</>
}
