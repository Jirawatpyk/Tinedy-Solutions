/**
 * CalendarErrorBoundary Component
 *
 * Error Boundary specific for Calendar components
 * Provides graceful error handling and recovery for calendar views
 */

import { Component, type ReactNode } from 'react'
import { AlertCircle, RefreshCw, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: string | null
}

export class CalendarErrorBoundary extends Component<Props, State> {
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
    logger.error('Calendar Error Boundary caught', { error, errorInfo }, { context: 'CalendarErrorBoundary' })
    this.setState({
      errorInfo: errorInfo.componentStack || null
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })

    // Reload the page to restore calendar state
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default calendar error UI
      return (
        <div className="flex items-center justify-center p-4 h-full min-h-[400px]">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <CardTitle className="text-lg">Calendar Error</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Unable to display the calendar. Please try refreshing the page or contact support if the problem persists.
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
                  Refresh Calendar
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Go to Dashboard
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
