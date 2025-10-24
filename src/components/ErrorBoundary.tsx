import { Component, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught:', error, errorInfo)
    this.setState({
      errorInfo: errorInfo.componentStack || null
    })

    // TODO: Send to error tracking service (e.g., Sentry)
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })

    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle className="text-xl">Something went wrong</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  We're sorry, but something unexpected happened. Our team has been notified and is working on a fix.
                </p>

                {this.state.error && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                      Technical Details
                    </summary>
                    <div className="mt-2 p-3 bg-gray-100 rounded-md">
                      <p className="text-xs font-mono text-gray-800 break-all">
                        {this.state.error.message}
                      </p>
                      {this.state.errorInfo && (
                        <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-40">
                          {this.state.errorInfo}
                        </pre>
                      )}
                    </div>
                  </details>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={this.handleReset}
                  variant="default"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                >
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Specialized error boundary for sections
interface SectionErrorBoundaryProps {
  children: ReactNode
  sectionName?: string
}

export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, State> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.sectionName || 'section'}:`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-900">
                Error loading {this.props.sectionName || 'this section'}
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <Button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
