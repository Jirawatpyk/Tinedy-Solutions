/**
 * useErrorHandler Hook
 *
 * React hook for standardized error handling in components.
 * Provides:
 * - Automatic error state management
 * - Error recovery functions
 * - Integration with ErrorBoundary
 */

import { useState, useCallback } from 'react'
import { handleError, withErrorHandling, type ErrorHandlerConfig } from '@/lib/error-handling'

export interface UseErrorHandlerOptions extends ErrorHandlerConfig {
  resetOnSuccess?: boolean
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const [error, setError] = useState<Error | null>(null)
  const [isError, setIsError] = useState(false)

  /**
   * Handle error and update state
   */
  const catchError = useCallback(
    (err: unknown) => {
      const { error: handledError } = handleError(err, options)
      setError(handledError)
      setIsError(true)
      return handledError
    },
    [options]
  )

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
    setIsError(false)
  }, [])

  /**
   * Execute async function with error handling
   */
  const execute = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      try {
        const result = await fn()
        if (options.resetOnSuccess) {
          clearError()
        }
        return result
      } catch (err) {
        catchError(err)
        return null
      }
    },
    [catchError, clearError, options.resetOnSuccess]
  )

  /**
   * Wrap async function with error handling (returns {data, error})
   */
  const wrap = useCallback(
    async <T,>(fn: () => Promise<T>) => {
      const { data, error: err } = await withErrorHandling(fn, options)
      if (err) {
        setError(err)
        setIsError(true)
      } else if (options.resetOnSuccess) {
        clearError()
      }
      return { data, error: err }
    },
    [options, clearError]
  )

  /**
   * Retry last failed operation
   */
  const retry = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      clearError()
      return execute(fn)
    },
    [execute, clearError]
  )

  return {
    error,
    isError,
    catchError,
    clearError,
    execute,
    wrap,
    retry,
  }
}

/**
 * useAsyncError Hook
 *
 * Simpler hook for components that just need to throw errors to ErrorBoundary
 */
export function useAsyncError() {
  const [, setError] = useState()

  return useCallback(
    (error: Error) => {
      setError(() => {
        throw error
      })
    },
    [setError]
  )
}
