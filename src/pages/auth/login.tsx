import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Lock, Mail, Eye, EyeOff } from 'lucide-react'
import logoVertical from '@/assets/logo/logo-vertical.svg'

// Helper function for role-based navigation
const getNavigationPath = (role: string | undefined, from: string | undefined) => {
  // Default paths by role
  const defaultPaths = {
    admin: '/admin',
    manager: '/manager',
    staff: '/staff'
  } as const

  const defaultPath = role ? defaultPaths[role as keyof typeof defaultPaths] || '/staff' : '/staff'

  // If no 'from' path, use default
  if (!from) return defaultPath

  // Check if 'from' path matches user's role
  const rolePathMatches = {
    admin: from.startsWith('/admin'),
    manager: from.startsWith('/manager'),
    staff: from.startsWith('/staff')
  }

  const hasAccess = role && rolePathMatches[role as keyof typeof rolePathMatches]

  return hasAccess ? from : defaultPath
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [lastAttempt, setLastAttempt] = useState<number>(0)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const RATE_LIMIT_MS = 2000 // 2 seconds between attempts

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
    setIsLoading(true)

    try {
      const profile = await signIn(email, password)
      toast({
        title: 'Success',
        description: 'Welcome to Tinedy CRM',
      })

      // Use helper function for navigation
      const navigationPath = getNavigationPath(profile?.role, location.state?.from?.pathname)
      navigate(navigationPath, { replace: true })
    } catch (error) {
      // Clear password for security
      setPassword('')

      toast({
        title: 'Sign in failed',
        description: error instanceof Error ? error.message : 'Failed to sign in',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
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
          <form onSubmit={handleSubmit} className="space-y-4" aria-label="Login form">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  className="pl-10"
                  title="Please enter a valid email address"
                  required
                  disabled={isLoading}
                  aria-label="Email address"
                  aria-required="true"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  minLength={6}
                  title="Password must be at least 6 characters"
                  required
                  disabled={isLoading}
                  aria-label="Password"
                  aria-required="true"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-tinedy-blue hover:bg-tinedy-blue/90"
              disabled={isLoading}
              aria-busy={isLoading}
              aria-label={isLoading ? 'Signing in...' : 'Sign in to your account'}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Demo credentials:
              <br />
              <span className="font-mono text-xs">admin@tinedy.com / admin123</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
