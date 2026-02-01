import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { logger } from '@/lib/logger'
import { UserRole } from '@/types/common'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  // Development-only logging
  logger.debug('ProtectedRoute state', {
    loading,
    hasUser: !!user,
    hasProfile: !!profile,
    profileRole: profile?.role,
    allowedRoles,
    currentPath: location.pathname
  }, { context: 'ProtectedRoute' })

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
    logger.debug('Redirecting to login: no user or profile', undefined, { context: 'ProtectedRoute' })
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    logger.debug('Redirecting to unauthorized: role mismatch', {
      userRole: profile.role,
      allowedRoles
    }, { context: 'ProtectedRoute' })
    return <Navigate to="/unauthorized" replace />
  }

  logger.debug('Access granted', undefined, { context: 'ProtectedRoute' })
  return <>{children}</>
}
