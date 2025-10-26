import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'

/**
 * RoleBasedRedirect component
 * Redirects users to their appropriate dashboard based on their role
 * - admin -> /admin
 * - staff -> /staff
 * - no user -> /login
 */
export function RoleBasedRedirect() {
  const { user, profile, loading } = useAuth()

  console.log('[RoleBasedRedirect] State:', {
    loading,
    hasUser: !!user,
    hasProfile: !!profile,
    profileRole: profile?.role
  })

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
    console.log('[RoleBasedRedirect] No user, redirecting to login')
    return <Navigate to="/login" replace />
  }

  // Redirect based on role
  if (profile.role === 'admin') {
    console.log('[RoleBasedRedirect] Admin user, redirecting to /admin')
    return <Navigate to="/admin" replace />
  } else if (profile.role === 'staff') {
    console.log('[RoleBasedRedirect] Staff user, redirecting to /staff')
    return <Navigate to="/staff" replace />
  }

  // Fallback (should never happen)
  console.error('[RoleBasedRedirect] Unknown role:', profile.role)
  return <Navigate to="/login" replace />
}
