import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Lock, Mail, Eye, EyeOff } from 'lucide-react'
import logoVertical from '@/assets/logo/logo-vertical.svg'
import { loginSchema, type LoginFormData } from '@/schemas'

// Helper function for role-based navigation
const getNavigationPath = (role: string | undefined, from: string | undefined) => {
  // Default paths by role (admin and manager share the same dashboard)
  const defaultPaths = {
    admin: '/admin',
    manager: '/admin',
    staff: '/staff'
  } as const

  const defaultPath = role ? defaultPaths[role as keyof typeof defaultPaths] || '/staff' : '/staff'

  // If no 'from' path, use default
  if (!from) return defaultPath

  // Check if 'from' path matches user's role
  // Note: manager can access /admin routes
  const rolePathMatches = {
    admin: from.startsWith('/admin'),
    manager: from.startsWith('/admin'),
    staff: from.startsWith('/staff')
  }

  const hasAccess = role && rolePathMatches[role as keyof typeof rolePathMatches]

  return hasAccess ? from : defaultPath
}

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [lastAttempt, setLastAttempt] = useState<number>(0)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const RATE_LIMIT_MS = 2000 // 2 seconds between attempts

  // React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    // Rate limiting check
    const now = Date.now()
    if (now - lastAttempt < RATE_LIMIT_MS) {
      toast({
        title: 'Please wait',
        description: 'Please wait a moment before trying again',
        variant: 'destructive',
      })
      return
    }

    setLastAttempt(now)

    try {
      const profile = await signIn(data.email, data.password)
      toast({
        title: 'Success',
        description: 'Welcome to Tinedy CRM',
      })

      // Use helper function for navigation
      const navigationPath = getNavigationPath(profile?.role, location.state?.from?.pathname)
      navigate(navigationPath, { replace: true })
    } catch (error) {
      // Clear password for security
      reset({ email: data.email, password: '' })

      toast({
        title: 'Sign in failed',
        description: error instanceof Error ? error.message : 'Failed to sign in',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-tinedy-blue via-tinedy-green to-tinedy-yellow p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <img
              src={logoVertical}
              alt="Tinedy Solutions"
              className="h-32 w-auto object-contain"
            />
          </div>
          <CardDescription className="font-rule text-base">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" aria-label="Login form">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  className="pl-10"
                  disabled={isSubmitting}
                  aria-label="Email address"
                  aria-required="true"
                  aria-invalid={!!errors.email}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register('password')}
                  className="pl-10 pr-10"
                  disabled={isSubmitting}
                  aria-label="Password"
                  aria-required="true"
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-tinedy-blue hover:bg-tinedy-blue/90"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              aria-label={isSubmitting ? 'Signing in...' : 'Sign in to your account'}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
