/**
 * Unit Tests for useOptimisticMutation
 *
 * ทดสอบ core functionality ของ optimistic update hook:
 * - Cache updates
 * - Rollback mechanism
 * - Local state updates
 * - Toast notifications
 * - Error handling
 * - Callbacks (onSuccess, onError, onSettled)
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOptimisticMutation } from '../useOptimisticMutation'
import React, { type ReactNode } from 'react'

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Mock mapErrorToUserMessage
vi.mock('@/lib/error-messages', () => ({
  mapErrorToUserMessage: (error: unknown) => ({
    title: 'Error',
    description: error instanceof Error ? error.message : 'Unknown error',
  }),
}))

describe('useOptimisticMutation', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  const wrapper = ({ children }: { children: ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }

  describe('Basic Functionality', () => {
    it('should call mutationFn successfully', async () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn,
          }),
        { wrapper }
      )

      await result.current.mutate({ id: '1' })

      expect(mutationFn).toHaveBeenCalledWith({ id: '1' })
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should set loading state during mutation', async () => {
      const mutationFn = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 50)
          })
      )

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn,
          }),
        { wrapper }
      )

      const mutatePromise = result.current.mutate({ id: '1' })

      // Wait for loading state to be set
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })

      await mutatePromise

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe('Optimistic Updates', () => {
    it('should update cache optimistically', async () => {
      const queryKey = ['test-data']
      queryClient.setQueryData(queryKey, [
        { id: '1', status: 'pending' },
        { id: '2', status: 'pending' },
      ])

      const mutationFn = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn,
            optimisticUpdate: {
              queryKeys: [queryKey],
              updater: (oldData, { id, status }) => {
                if (!oldData || !Array.isArray(oldData)) return oldData
                return oldData.map((item: { id: string; status: string }) =>
                  item.id === id ? { ...item, status } : item
                )
              },
            },
          }),
        { wrapper }
      )

      await result.current.mutate({ id: '1', status: 'active' })

      const data = queryClient.getQueryData(queryKey)
      expect(data).toEqual([
        { id: '1', status: 'active' },
        { id: '2', status: 'pending' },
      ])
    })

    it('should rollback cache on error', async () => {
      const queryKey = ['test-data']
      const originalData = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'pending' },
      ]
      queryClient.setQueryData(queryKey, originalData)

      const mutationFn = vi.fn().mockRejectedValue(new Error('API error'))

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn,
            optimisticUpdate: {
              queryKeys: [queryKey],
              updater: (oldData, { id, status }) => {
                if (!oldData || !Array.isArray(oldData)) return oldData
                return oldData.map((item: { id: string; status: string }) =>
                  item.id === id ? { ...item, status } : item
                )
              },
            },
            toast: {
              errorContext: 'general',
            },
          }),
        { wrapper }
      )

      try {
        await result.current.mutate({ id: '1', status: 'active' })
      } catch (e) {
        // Expected error
      }

      await waitFor(() => {
        const data = queryClient.getQueryData(queryKey)
        expect(data).toEqual(originalData)
      })
    })
  })

  describe('Local State Updates', () => {
    it('should update local state optimistically', async () => {
      let localState = { id: '1', name: 'Original' }
      const setState = vi.fn((newState) => {
        localState = newState
      })

      const mutationFn = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn,
            localStateUpdate: {
              currentState: localState,
              setState,
              updater: (current, { name }) => ({ ...current, name }),
            },
          }),
        { wrapper }
      )

      await result.current.mutate({ name: 'Updated' })

      expect(setState).toHaveBeenCalledWith({
        id: '1',
        name: 'Updated',
      })
    })

    it('should rollback local state on error', async () => {
      let localState = { id: '1', name: 'Original' }
      const setState = vi.fn((newState) => {
        localState = newState
      })

      const mutationFn = vi.fn().mockRejectedValue(new Error('API error'))

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn,
            localStateUpdate: {
              currentState: localState,
              setState,
              updater: (current, { name }) => ({ ...current, name }),
            },
            toast: {
              errorContext: 'general',
            },
          }),
        { wrapper }
      )

      try {
        await result.current.mutate({ name: 'Updated' })
      } catch (e) {
        // Expected error
      }

      await waitFor(() => {
        // Should be called twice: once for update, once for rollback
        expect(setState).toHaveBeenCalledTimes(2)
        // Last call should restore original state
        expect(setState).toHaveBeenLastCalledWith({
          id: '1',
          name: 'Original',
        })
      })
    })

    it('should respect shouldUpdate condition', async () => {
      let localState = { id: '1', name: 'Original' }
      const setState = vi.fn()

      const mutationFn = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn,
            localStateUpdate: {
              currentState: localState,
              setState,
              updater: (current, { name }) => ({ ...current, name }),
              shouldUpdate: (current, { id }) => current.id === id,
            },
          }),
        { wrapper }
      )

      // Should NOT update (different id)
      await result.current.mutate({ id: '2', name: 'Updated' })
      expect(setState).not.toHaveBeenCalled()

      // Should update (same id)
      await result.current.mutate({ id: '1', name: 'Updated' })
      expect(setState).toHaveBeenCalledWith({
        id: '1',
        name: 'Updated',
      })
    })
  })

  describe('Callbacks', () => {
    it('should call onSuccess callback', async () => {
      const onSuccess = vi.fn()
      const mutationFn = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn,
            onSuccess,
          }),
        { wrapper }
      )

      await result.current.mutate({ id: '1' })

      expect(onSuccess).toHaveBeenCalledTimes(1)
    })

    it('should call onError callback', async () => {
      const onError = vi.fn()
      const mutationFn = vi.fn().mockRejectedValue(new Error('API error'))

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn,
            onError,
            toast: {
              errorContext: 'general',
            },
          }),
        { wrapper }
      )

      try {
        await result.current.mutate({ id: '1' })
      } catch (e) {
        // Expected error
      }

      await waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(1)
      })
    })

    it('should call onSettled callback always', async () => {
      const onSettled = vi.fn()
      const mutationFn = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn,
            onSettled,
          }),
        { wrapper }
      )

      await result.current.mutate({ id: '1' })

      expect(onSettled).toHaveBeenCalledTimes(1)
    })

    it('should call onSettled even on error', async () => {
      const onSettled = vi.fn()
      const mutationFn = vi.fn().mockRejectedValue(new Error('API error'))

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn,
            onSettled,
            toast: {
              errorContext: 'general',
            },
          }),
        { wrapper }
      )

      try {
        await result.current.mutate({ id: '1' })
      } catch (e) {
        // Expected error
      }

      await waitFor(() => {
        expect(onSettled).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Error Handling', () => {
    it('should store error state', async () => {
      const error = new Error('API error')
      const mutationFn = vi.fn().mockRejectedValue(error)

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn,
            toast: {
              errorContext: 'general',
            },
          }),
        { wrapper }
      )

      try {
        await result.current.mutate({ id: '1' })
      } catch (e) {
        // Expected error
      }

      await waitFor(() => {
        expect(result.current.error).toBe(error)
      })
    })

    it('should reset error state', async () => {
      const error = new Error('API error')
      const mutationFn = vi.fn().mockRejectedValue(error)

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn,
            toast: {
              errorContext: 'general',
            },
          }),
        { wrapper }
      )

      try {
        await result.current.mutate({ id: '1' })
      } catch (e) {
        // Expected error
      }

      await waitFor(() => {
        expect(result.current.error).toBe(error)
      })

      result.current.reset()

      await waitFor(() => {
        expect(result.current.error).toBeNull()
      })
    })
  })

  describe('mutateAsync', () => {
    it('should work like mutate but return promise', async () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn,
          }),
        { wrapper }
      )

      const promise = result.current.mutateAsync({ id: '1' })
      expect(promise).toBeInstanceOf(Promise)

      await promise

      expect(mutationFn).toHaveBeenCalledWith({ id: '1' })
    })

    it('should reject promise on error', async () => {
      const error = new Error('API error')
      const mutationFn = vi.fn().mockRejectedValue(error)

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn,
            toast: {
              errorContext: 'general',
            },
          }),
        { wrapper }
      )

      await expect(result.current.mutateAsync({ id: '1' })).rejects.toThrow('API error')
    })
  })
})
