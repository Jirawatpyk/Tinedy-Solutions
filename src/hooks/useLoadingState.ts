import { useState, useCallback } from 'react'

/**
 * Custom hook for managing loading state with convenient helper methods
 *
 * Provides a standardized way to manage loading states across the application
 * with clear, semantic methods for starting and stopping loading.
 *
 * @param initialState - Initial loading state (default: true)
 * @returns Object containing loading state and helper methods
 *
 * @example
 * ```tsx
 * const { loading, startLoading, stopLoading } = useLoadingState()
 *
 * const fetchData = async () => {
 *   startLoading()
 *   try {
 *     const data = await api.getData()
 *   } finally {
 *     stopLoading()
 *   }
 * }
 * ```
 */
export function useLoadingState(initialState: boolean = true) {
  const [loading, setLoading] = useState(initialState)

  const startLoading = useCallback(() => {
    setLoading(true)
  }, [])

  const stopLoading = useCallback(() => {
    setLoading(false)
  }, [])

  return {
    loading,
    setLoading,
    startLoading,
    stopLoading,
  }
}
