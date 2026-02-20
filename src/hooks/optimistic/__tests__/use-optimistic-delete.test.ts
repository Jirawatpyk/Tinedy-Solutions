/**
 * Unit Tests for useOptimisticDelete Hook
 *
 * Tests:
 * - Soft delete operations (archive)
 * - Restore operations
 * - Permanent delete operations
 * - Optimistic cache updates
 * - Error rollback
 * - Toast notifications
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOptimisticDelete } from '../use-optimistic-delete'
import React, { type ReactNode } from 'react'

// Mock sonner toast (code uses toast.success/toast.error from sonner)
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

// Mock Supabase
const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

describe('useOptimisticDelete', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    // Setup mock chain for Supabase
    mockFrom.mockReturnValue({
      update: mockUpdate,
      delete: mockDelete,
    })
    mockUpdate.mockReturnValue({
      eq: mockEq,
    })
    mockDelete.mockReturnValue({
      eq: mockEq,
    })
    mockEq.mockReturnValue({
      select: mockSelect,
    })
    mockSelect.mockReturnValue({
      single: mockSingle,
    })
  })

  const wrapper = ({ children }: { children: ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }

  describe('Soft Delete (Archive)', () => {
    it('should soft delete booking with optimistic update', async () => {
      // Setup: Add bookings to cache
      const queryKey = ['bookings']
      const mockBookings = [
        { id: 'booking-1', customer_name: 'John' },
        { id: 'booking-2', customer_name: 'Jane' },
      ]
      queryClient.setQueryData(queryKey, mockBookings)

      // Mock successful RPC call
      mockRpc.mockResolvedValue({ data: null, error: null })

      const { result } = renderHook(
        () =>
          useOptimisticDelete({
            table: 'bookings',
            onSuccess: vi.fn(),
          }),
        { wrapper }
      )

      // Execute soft delete
      await result.current.softDelete.mutate({ id: 'booking-1' })

      // Verify cache updated (item removed)
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<typeof mockBookings>(queryKey)
        expect(cachedData).toHaveLength(1)
        expect(cachedData?.[0].id).toBe('booking-2')
      })

      // Verify RPC called
      expect(mockRpc).toHaveBeenCalledWith('soft_delete_record', {
        table_name: 'bookings',
        record_id: 'booking-1',
      })

      // Verify toast (Sonner: toast.success(title, { description }))
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Success', {
          description: 'Booking archived successfully',
        })
      })
    })

    it('should handle soft delete for different tables', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })

      // Test customers
      const { result: customersResult } = renderHook(
        () => useOptimisticDelete({ table: 'customers', onSuccess: vi.fn() }),
        { wrapper }
      )

      await customersResult.current.softDelete.mutate({ id: 'customer-1' })

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Success', {
          description: 'Customer archived successfully',
        })
      })

      // Test teams
      const { result: teamsResult } = renderHook(
        () => useOptimisticDelete({ table: 'teams', onSuccess: vi.fn() }),
        { wrapper }
      )

      await teamsResult.current.softDelete.mutate({ id: 'team-1' })

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Success', {
          description: 'Team archived successfully',
        })
      })
    })

    it('should rollback cache on soft delete error', async () => {
      const queryKey = ['bookings']
      const mockBookings = [
        { id: 'booking-1', customer_name: 'John' },
        { id: 'booking-2', customer_name: 'Jane' },
      ]
      queryClient.setQueryData(queryKey, mockBookings)

      // Mock error
      mockRpc.mockResolvedValue({ data: null, error: { message: 'Delete failed' } })

      const { result } = renderHook(
        () => useOptimisticDelete({ table: 'bookings', onSuccess: vi.fn() }),
        { wrapper }
      )

      try {
        await result.current.softDelete.mutate({ id: 'booking-1' })
      } catch (error) {
        // Expected to throw
      }

      // Verify cache rolled back (item still exists)
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<typeof mockBookings>(queryKey)
        expect(cachedData).toHaveLength(2)
        expect(cachedData?.find((b) => b.id === 'booking-1')).toBeDefined()
      })
    })
  })

  describe('Restore', () => {
    it('should restore deleted item', async () => {
      const queryKey = ['bookings']
      const mockBookings = [{ id: 'booking-2', customer_name: 'Jane' }]
      queryClient.setQueryData(queryKey, mockBookings)

      // Mock successful restore
      const restoredItem = { id: 'booking-1', customer_name: 'John', deleted_at: null }
      mockSingle.mockResolvedValue({ data: restoredItem, error: null })

      const { result } = renderHook(
        () => useOptimisticDelete({ table: 'bookings', onSuccess: vi.fn() }),
        { wrapper }
      )

      await result.current.restore.mutate({ id: 'booking-1' })

      // Verify Supabase called
      expect(mockFrom).toHaveBeenCalledWith('bookings')
      expect(mockUpdate).toHaveBeenCalledWith({ deleted_at: null, deleted_by: null })
      expect(mockEq).toHaveBeenCalledWith('id', 'booking-1')

      // Verify toast
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Success', {
          description: 'Booking restored successfully',
        })
      })
    })

    it('should handle restore error', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Restore failed' },
      })

      const { result } = renderHook(
        () => useOptimisticDelete({ table: 'bookings', onSuccess: vi.fn() }),
        { wrapper }
      )

      try {
        await result.current.restore.mutate({ id: 'booking-1' })
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('Permanent Delete', () => {
    it('should permanently delete item with optimistic update', async () => {
      const queryKey = ['bookings']
      const mockBookings = [
        { id: 'booking-1', customer_name: 'John' },
        { id: 'booking-2', customer_name: 'Jane' },
      ]
      queryClient.setQueryData(queryKey, mockBookings)

      // Mock successful delete
      mockEq.mockResolvedValue({ data: null, error: null })

      const { result } = renderHook(
        () => useOptimisticDelete({ table: 'bookings', onSuccess: vi.fn() }),
        { wrapper }
      )

      await result.current.permanentDelete.mutate({ id: 'booking-1' })

      // Verify cache updated (item removed)
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<typeof mockBookings>(queryKey)
        expect(cachedData).toHaveLength(1)
        expect(cachedData?.[0].id).toBe('booking-2')
      })

      // Verify Supabase called
      expect(mockFrom).toHaveBeenCalledWith('bookings')
      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', 'booking-1')

      // Verify toast
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Success', {
          description: 'Booking permanently deleted',
        })
      })
    })

    it('should rollback on permanent delete error', async () => {
      const queryKey = ['bookings']
      const mockBookings = [
        { id: 'booking-1', customer_name: 'John' },
        { id: 'booking-2', customer_name: 'Jane' },
      ]
      queryClient.setQueryData(queryKey, mockBookings)

      // Mock error
      mockEq.mockResolvedValue({ data: null, error: { message: 'Delete failed' } })

      const { result } = renderHook(
        () => useOptimisticDelete({ table: 'bookings', onSuccess: vi.fn() }),
        { wrapper }
      )

      try {
        await result.current.permanentDelete.mutate({ id: 'booking-1' })
      } catch (error) {
        // Expected to throw
      }

      // Verify cache rolled back
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<typeof mockBookings>(queryKey)
        expect(cachedData).toHaveLength(2)
      })
    })
  })

  describe('Loading States', () => {
    it('should track loading state for soft delete', async () => {
      let resolveFn!: (value: { data: null; error: null }) => void
      mockRpc.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFn = resolve
          })
      )

      const { result } = renderHook(
        () => useOptimisticDelete({ table: 'bookings', onSuccess: vi.fn() }),
        { wrapper }
      )

      expect(result.current.softDelete.isLoading).toBe(false)

      const mutatePromise = result.current.softDelete.mutate({ id: 'booking-1' })

      await waitFor(() => {
        expect(result.current.softDelete.isLoading).toBe(true)
      })

      // Resolve the pending RPC call
      resolveFn({ data: null, error: null })
      await mutatePromise

      await waitFor(() => {
        expect(result.current.softDelete.isLoading).toBe(false)
      })
    })

    it('should have independent loading states', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      mockSingle.mockResolvedValue({ data: {}, error: null })
      mockEq.mockResolvedValue({ data: null, error: null })

      const { result } = renderHook(
        () => useOptimisticDelete({ table: 'bookings', onSuccess: vi.fn() }),
        { wrapper }
      )

      // All should start as not loading
      expect(result.current.softDelete.isLoading).toBe(false)
      expect(result.current.restore.isLoading).toBe(false)
      expect(result.current.permanentDelete.isLoading).toBe(false)
    })
  })

  describe('onSuccess Callback', () => {
    it('should call onSuccess after successful soft delete', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      const onSuccess = vi.fn()

      const { result } = renderHook(
        () => useOptimisticDelete({ table: 'bookings', onSuccess }),
        { wrapper }
      )

      await result.current.softDelete.mutate({ id: 'booking-1' })

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })
    })

    it('should call onSuccess after successful restore', async () => {
      mockSingle.mockResolvedValue({ data: {}, error: null })
      const onSuccess = vi.fn()

      const { result } = renderHook(
        () => useOptimisticDelete({ table: 'bookings', onSuccess }),
        { wrapper }
      )

      await result.current.restore.mutate({ id: 'booking-1' })

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })
    })
  })
})
