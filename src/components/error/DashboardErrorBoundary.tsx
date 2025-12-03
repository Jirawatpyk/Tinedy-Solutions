import { Component, type ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: { componentStack: string } | null
}

/**
 * Error Boundary for Dashboard Components
 *
 * Catches errors in Dashboard components and displays a user-friendly fallback UI.
 * Provides options to retry or navigate to home.
 *
 * Usage:
 * ```tsx
 * <DashboardErrorBoundary>
 *   <Dashboard />
 * </DashboardErrorBoundary>
 * ```
 */
export class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Dashboard Error Boundary caught an error:', error, errorInfo)
    }

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo)

    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    const { hasError, error } = this.state
    const { children, fallback } = this.props

    if (hasError) {
      // Custom fallback UI provided by parent
      if (fallback) {
        return fallback
      }

      // Default fallback UI
      return (
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <Alert variant="destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle className="text-lg font-semibold mb-2">
                  Something went wrong
                </AlertTitle>
                <AlertDescription className="space-y-4">
                  <p className="text-sm">
                    The dashboard encountered an unexpected error and could not be displayed.
                    This issue has been logged and we'll look into it.
                  </p>

                  {/* Error details (only in development) */}
                  {import.meta.env.DEV && error && (
                    <div className="mt-4 p-4 bg-muted rounded-md">
                      <p className="text-xs font-mono text-destructive break-all">
                        {error.toString()}
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <Button
                      onClick={this.handleReset}
                      variant="default"
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                    <Button
                      onClick={this.handleGoHome}
                      variant="outline"
                      className="flex-1"
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Go to Home
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      )
    }

    return children
  }
}

/**
 * Hook-style Error Boundary wrapper for functional components
 *
 * @example
 * ```tsx
 * function DashboardPage() {
 *   return (
 *     <WithErrorBoundary>
 *       <Dashboard />
 *     </WithErrorBoundary>
 *   )
 * }
 * ```
 */
export function WithErrorBoundary({ children }: { children: ReactNode }) {
  return <DashboardErrorBoundary>{children}</DashboardErrorBoundary>
}
