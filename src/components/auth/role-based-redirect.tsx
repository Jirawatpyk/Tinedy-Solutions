import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { logger } from '@/lib/logger'

/**
 * RoleBasedRedirect component
 * Redirects users to their appropriate dashboard based on their role
 * - admin, manager -> /admin (shared dashboard)
 * - staff -> /staff
 * - no user -> /login
 */
export function RoleBasedRedirect() {
  const { user, profile, loading } = useAuth()

  logger.debug('RoleBasedRedirect state', {
    loading,
    hasUser: !!user,
    hasProfile: !!profile,
    profileRole: profile?.role
  }, { context: 'RoleBasedRedirect' })

  // Show loading while checking auth
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

  // Not logged in -> go to login
  if (!user || !profile) {
    logger.debug('No user, redirecting to login', undefined, { context: 'RoleBasedRedirect' })
    return <Navigate to="/login" replace />
  }

  // Redirect based on role
  // Note: Admin and Manager now share the same dashboard at /admin
  if (profile.role === 'admin' || profile.role === 'manager') {
    logger.debug(`${profile.role} user, redirecting to /admin`, undefined, { context: 'RoleBasedRedirect' })
    return <Navigate to="/admin" replace />
  } else if (profile.role === 'staff') {
    logger.debug('Staff user, redirecting to /staff', undefined, { context: 'RoleBasedRedirect' })
    return <Navigate to="/staff" replace />
  }

  // Fallback (should never happen)
  logger.error('Unknown role, redirecting to login', { role: profile.role }, { context: 'RoleBasedRedirect' })
  return <Navigate to="/login" replace />
}
