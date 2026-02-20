/**
 * useOptimisticMutation Hook
 *
 * Generic hook สำหรับ mutations พร้อม optimistic updates และ rollback mechanism
 *
 * Pattern จาก useBookingStatusManager (lines 131-211):
 * 1. Set loading state
 * 2. Save previous cache data (queryClient.getQueriesData)
 * 3. Optimistic update (queryClient.setQueryData)
 * 4. Update local state (selectedBooking, etc.)
 * 5. Call API (mutationFn)
 * 6. Show success toast
 * 7. Trigger refetch (onSuccess callback)
 * 8. On error: Rollback cache + local state + show error toast
 * 9. Clear loading state
 *
 * @example
 * ```tsx
 * const { mutate, isLoading } = useOptimisticMutation({
 *   mutationFn: async ({ bookingId, newStatus }) => {
 *     const { error } = await supabase
 *       .from('bookings')
 *       .update({ status: newStatus })
 *       .eq('id', bookingId)
 *     if (error) throw error
 *   },
 *   optimisticUpdate: {
 *     queryKeys: [queryKeys.bookings.all],
 *     updater: (oldData, { bookingId, newStatus }) => {
 *       if (!oldData) return oldData
 *       return oldData.map(booking =>
 *         booking.id === bookingId
 *           ? { ...booking, status: newStatus }
 *           : booking
 *       )
 *     }
 *   },
 *   localStateUpdate: {
 *     currentState: selectedBooking,
 *     setState: setSelectedBooking,
 *     updater: (current, { newStatus }) => ({ ...current, status: newStatus }),
 *     shouldUpdate: (current, { bookingId }) => current.id === bookingId
 *   },
 *   toast: {
 *     successTitle: 'Success',
 *     successDescription: 'Status updated',
 *     errorContext: 'booking'
 *   },
 *   onSuccess: refetchBookings
 * })
 * ```
 */

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import type {
  UseOptimisticMutationOptions,
  UseOptimisticMutationReturn,
} from './types'

export function useOptimisticMutation<TData, TVariables, TLocalState = never>(
  options: UseOptimisticMutationOptions<TData, TVariables, TLocalState>
): UseOptimisticMutationReturn<TVariables> {
  const {
    mutationFn,
    optimisticUpdate,
    localStateUpdate,
    toast: toastConfig,
    onSuccess,
    onError,
    onSettled,
  } = options

  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<unknown | null>(null)

  const mutate = useCallback(
    async (variables: TVariables) => {
      // 1. Set loading state
      setIsLoading(true)
      setError(null)

      // 2. Save previous data for rollback (ถ้ามี optimistic update)
      let previousQueryData: Array<[unknown, unknown]> = []
      let previousLocalState: TLocalState | null = null

      if (optimisticUpdate) {
        // Save all query data that we're about to modify
        previousQueryData = optimisticUpdate.queryKeys.map((queryKey) => {
          const data = queryClient.getQueryData(queryKey)
          return [queryKey, data]
        })

        // 3. Optimistic update - Update cache immediately
        optimisticUpdate.queryKeys.forEach((queryKey) => {
          queryClient.setQueryData(queryKey, (oldData: TData | undefined) => {
            return optimisticUpdate.updater(oldData, variables)
          })
        })
      }

      // 4. Update local state immediately (ถ้ามี)
      if (localStateUpdate && localStateUpdate.currentState) {
        const { currentState, setState, updater, shouldUpdate } = localStateUpdate

        // Check if should update
        const canUpdate = shouldUpdate ? shouldUpdate(currentState, variables) : true

        if (canUpdate) {
          previousLocalState = currentState
          const newState = updater(currentState, variables)
          setState(newState)
        }
      }

      try {
        // 5. Call API in background
        const result = await mutationFn(variables)

        // 6. Show success toast
        if (toastConfig) {
          const description =
            typeof toastConfig.successDescription === 'function'
              ? toastConfig.successDescription(result)
              : toastConfig.successDescription

          toast.success(toastConfig.successTitle || 'Operation completed successfully', {
            description: description,
          })
        }

        // 7. Trigger background refetch to sync with server
        if (onSuccess) {
          await onSuccess()
        }
      } catch (err) {
        // 8. Rollback on error

        // Rollback query cache
        if (optimisticUpdate && previousQueryData.length > 0) {
          previousQueryData.forEach(([queryKey, data]) => {
            queryClient.setQueryData(queryKey as unknown[], data)
          })
        }

        // Rollback local state
        if (localStateUpdate && previousLocalState !== null) {
          localStateUpdate.setState(previousLocalState)
        }

        // Show error toast
        if (toastConfig) {
          const errorMsg = mapErrorToUserMessage(err, toastConfig.errorContext || 'general')
          toast.error(toastConfig.errorTitle || errorMsg.title, {
            description: toastConfig.errorDescription || errorMsg.description,
          })
        }

        // Call onError callback
        if (onError) {
          onError(err)
        }

        // Store error
        setError(err)

        // Re-throw for mutateAsync
        throw err
      } finally {
        // 9. Clear loading state
        setIsLoading(false)

        // Call onSettled callback
        if (onSettled) {
          onSettled()
        }
      }
    },
    [
      mutationFn,
      optimisticUpdate,
      localStateUpdate,
      toastConfig,
      onSuccess,
      onError,
      onSettled,
      queryClient,
    ]
  )

  const mutateAsync = useCallback(
    async (variables: TVariables) => {
      await mutate(variables)
    },
    [mutate]
  )

  const reset = useCallback(() => {
    setError(null)
  }, [])

  return {
    mutate,
    mutateAsync,
    isLoading,
    error,
    reset,
  }
}
