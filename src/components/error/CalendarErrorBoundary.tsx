/**
 * Calendar Error Boundary Component
 *
 * Catches JavaScript errors in the Calendar component tree
 * and displays a fallback UI instead of crashing the entire application.
 */

import { Component, type ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class CalendarErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error('[CalendarErrorBoundary] Caught error:', error, errorInfo)

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    })

    // TODO: Send error to monitoring service (e.g., Sentry)
    // logErrorToService(error, errorInfo)
  }

  handleReset = () => {
    // Reset error boundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })

    // Reload the page to reset the application state
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              <p className="mb-4">
                The calendar encountered an unexpected error. Please try refreshing the page.
              </p>

              {/* Error details (development only) */}
              {this.state.error && (
                <details className="mb-4 text-xs">
                  <summary className="cursor-pointer font-medium hover:underline">
                    Error details (for debugging)
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto whitespace-pre-wrap break-words">
                    {this.state.error.message}
                    {this.state.errorInfo && '\n\n' + this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="default">
                  Refresh Page
                </Button>
                <Button
                  onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                  variant="outline"
                >
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return this.props.children
  }
}
