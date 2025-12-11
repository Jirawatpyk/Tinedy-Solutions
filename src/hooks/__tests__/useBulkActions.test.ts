/**
 * Unit Tests for useBulkActions Hook
 *
 * Tests:
 * - Bulk delete with optimistic updates
 * - Rollback on error
 * - Toast notifications
 * - Selection management
 * - Performance (50+ items)
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBulkActions } from '../useBulkActions'
import React, { type ReactNode } from 'react'
import type { Booking } from '@/types/booking'

// Mock useToast
const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

// Mock Supabase
const mockRpc = vi.fn()
const mockUpdate = vi.fn()
const mockIn = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({
      update: (...args: unknown[]) => mockUpdate(...args),
    }),
  },
}))

// Mock mapErrorToUserMessage
vi.mock('@/lib/error-messages', () => ({
  mapErrorToUserMessage: (error: unknown) => ({
    title: 'Error',
    description: error instanceof Error ? error.message : 'Unknown error',
  }),
}))

// Mock booking-utils
vi.mock('@/lib/booking-utils', () => ({
  formatFullAddress: () => '123 Test St',
  getValidTransitions: () => ['confirmed', 'completed'],
}))

// Mock formatCurrency
vi.mock('@/lib/utils', () => ({
  formatCurrency: (amount: number) => `฿${amount.toLocaleString()}`,
}))

// Mock XLSX
vi.mock('xlsx', () => ({
  default: {
    utils: {
      json_to_sheet: vi.fn(),
      book_new: vi.fn(),
      book_append_sheet: vi.fn(),
    },
    writeFile: vi.fn(),
  },
}))

describe('useBulkActions', () => {
  let queryClient: QueryClient

  const mockBookings: Booking[] = [
    {
      id: 'booking-1',
      status: 'pending',
      booking_date: '2024-01-15',
      start_time: '10:00',
      end_time: '12:00',
      total_price: 1000,
      address: '123 Main St',
      city: 'Bangkok',
      state: 'Bangkok',
      zip_code: '10100',
      staff_id: 'staff-1',
      team_id: 'team-1',
      service_package_id: 'pkg-1',
      payment_status: 'unpaid',
      notes: null,
      customers: { id: 'cust-1', full_name: 'John Doe', email: 'john@example.com' },
      service_packages: { name: 'Basic Cleaning', service_type: 'cleaning', price: 1000 },
      profiles: { full_name: 'Staff One' },
      teams: { name: 'Team A' },
    },
    {
      id: 'booking-2',
      status: 'confirmed',
      booking_date: '2024-01-16',
      start_time: '14:00',
      end_time: '16:00',
      total_price: 1500,
      address: '456 Second St',
      city: 'Bangkok',
      state: 'Bangkok',
      zip_code: '10200',
      staff_id: 'staff-2',
      team_id: 'team-1',
      service_package_id: 'pkg-2',
      payment_status: 'unpaid',
      notes: null,
      customers: { id: 'cust-2', full_name: 'Jane Smith', email: 'jane@example.com' },
      service_packages: { name: 'Deep Cleaning', service_type: 'cleaning', price: 1500 },
      profiles: { full_name: 'Staff Two' },
      teams: { name: 'Team A' },
    },
    {
      id: 'booking-3',
      status: 'pending',
      booking_date: '2024-01-17',
      start_time: '09:00',
      end_time: '11:00',
      total_price: 1200,
      address: '789 Third St',
      city: 'Bangkok',
      state: 'Bangkok',
      zip_code: '10300',
      staff_id: 'staff-3',
      team_id: 'team-2',
      service_package_id: 'pkg-1',
      payment_status: 'unpaid',
      notes: null,
      customers: { id: 'cust-3', full_name: 'Bob Johnson', email: 'bob@example.com' },
      service_packages: { name: 'Basic Cleaning', service_type: 'cleaning', price: 1000 },
      profiles: { full_name: 'Staff Three' },
      teams: { name: 'Team B' },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    // Setup mock chain for update
    mockUpdate.mockReturnValue({
      in: mockIn,
    })
    mockIn.mockResolvedValue({ error: null })
  })

  const wrapper = ({ children }: { children: ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }

  describe('Selection Management', () => {
    it('should select all bookings when toggleSelectAll is called', () => {
      const onSuccess = vi.fn()
      const { result } = renderHook(
        () =>
          useBulkActions({
            bookings: mockBookings,
            filteredBookings: mockBookings,
            onSuccess,
          }),
        { wrapper }
      )

      expect(result.current.selectedBookings).toHaveLength(0)

      act(() => {
        result.current.toggleSelectAll()
      })

      expect(result.current.selectedBookings).toHaveLength(3)
      expect(result.current.selectedBookings).toEqual(['booking-1', 'booking-2', 'booking-3'])
    })

    it('should deselect all when toggleSelectAll is called twice', () => {
      const onSuccess = vi.fn()
      const { result } = renderHook(
        () =>
          useBulkActions({
            bookings: mockBookings,
            filteredBookings: mockBookings,
            onSuccess,
          }),
        { wrapper }
      )

      act(() => {
        result.current.toggleSelectAll()
      })
      expect(result.current.selectedBookings).toHaveLength(3)

      act(() => {
        result.current.toggleSelectAll()
      })
      expect(result.current.selectedBookings).toHaveLength(0)
    })

    it('should toggle individual booking selection', () => {
      const onSuccess = vi.fn()
      const { result } = renderHook(
        () =>
          useBulkActions({
            bookings: mockBookings,
            filteredBookings: mockBookings,
            onSuccess,
          }),
        { wrapper }
      )

      act(() => {
        result.current.toggleSelectBooking('booking-1')
      })
      expect(result.current.selectedBookings).toEqual(['booking-1'])

      act(() => {
        result.current.toggleSelectBooking('booking-2')
      })
      expect(result.current.selectedBookings).toEqual(['booking-1', 'booking-2'])

      act(() => {
        result.current.toggleSelectBooking('booking-1')
      })
      expect(result.current.selectedBookings).toEqual(['booking-2'])
    })

    it('should handle array of booking IDs for group selection', () => {
      const onSuccess = vi.fn()
      const { result } = renderHook(
        () =>
          useBulkActions({
            bookings: mockBookings,
            filteredBookings: mockBookings,
            onSuccess,
          }),
        { wrapper }
      )

      act(() => {
        result.current.toggleSelectBooking(['booking-1', 'booking-2'])
      })
      expect(result.current.selectedBookings).toEqual(['booking-1', 'booking-2'])

      act(() => {
        result.current.toggleSelectBooking(['booking-1', 'booking-2'])
      })
      expect(result.current.selectedBookings).toHaveLength(0)
    })
  })

  describe('Bulk Delete with Optimistic Updates', () => {
    it('should delete multiple bookings with optimistic cache update', async () => {
      // Setup: Add bookings to cache (use correct query key)
      const queryKey = ['bookings'] // This matches queryKeys.bookings.all
      queryClient.setQueryData(queryKey, mockBookings)

      // Mock successful RPC calls
      mockRpc.mockResolvedValue({ data: null, error: null })

      const onSuccess = vi.fn()
      const { result } = renderHook(
        () =>
          useBulkActions({
            bookings: mockBookings,
            filteredBookings: mockBookings,
            onSuccess,
          }),
        { wrapper }
      )

      // Select 2 bookings
      act(() => {
        result.current.toggleSelectBooking('booking-1')
        result.current.toggleSelectBooking('booking-2')
      })

      // Open confirmation dialog
      act(() => {
        result.current.handleBulkDelete()
      })
      expect(result.current.showDeleteConfirm).toBe(true)

      // Confirm deletion
      await act(async () => {
        await result.current.confirmBulkDelete()
      })

      // Verify RPC called for each booking
      expect(mockRpc).toHaveBeenCalledTimes(2)
      expect(mockRpc).toHaveBeenCalledWith('soft_delete_record', {
        table_name: 'bookings',
        record_id: 'booking-1',
      })
      expect(mockRpc).toHaveBeenCalledWith('soft_delete_record', {
        table_name: 'bookings',
        record_id: 'booking-2',
      })

      // Verify success toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Archived 2 bookings successfully',
        })
      })

      // Verify selections cleared
      expect(result.current.selectedBookings).toHaveLength(0)
      expect(result.current.showDeleteConfirm).toBe(false)

      // Verify onSuccess called
      expect(onSuccess).toHaveBeenCalled()
    })

    it('should handle single booking delete correctly', async () => {
      const queryKey = ['bookings']
      queryClient.setQueryData(queryKey, mockBookings)
      mockRpc.mockResolvedValue({ data: null, error: null })

      const onSuccess = vi.fn()
      const { result } = renderHook(
        () =>
          useBulkActions({
            bookings: mockBookings,
            filteredBookings: mockBookings,
            onSuccess,
          }),
        { wrapper }
      )

      act(() => {
        result.current.toggleSelectBooking('booking-1')
      })

      await act(async () => {
        await result.current.confirmBulkDelete()
      })

      // Should show singular form in toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Archived 1 booking successfully',
        })
      })
    })

    it('should rollback cache on bulk delete error', async () => {
      const queryKey = ['bookings']
      queryClient.setQueryData(queryKey, mockBookings)

      // Mock error - second booking fails
      mockRpc
        .mockResolvedValueOnce({ data: null, error: null }) // booking-1 succeeds
        .mockResolvedValueOnce({ data: null, error: { message: 'Delete failed' } }) // booking-2 fails

      const onSuccess = vi.fn()
      const { result } = renderHook(
        () =>
          useBulkActions({
            bookings: mockBookings,
            filteredBookings: mockBookings,
            onSuccess,
          }),
        { wrapper }
      )

      act(() => {
        result.current.toggleSelectBooking('booking-1')
        result.current.toggleSelectBooking('booking-2')
      })

      await act(async () => {
        await result.current.confirmBulkDelete()
      })

      // Verify cache rolled back (items still exist)
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<Booking[]>(queryKey)
        expect(cachedData).toHaveLength(3)
      })

      // Verify error toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error',
            variant: 'destructive',
          })
        )
      })

      // onSuccess should not be called on error
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('should handle 50+ bookings efficiently', async () => {
      // Create 50 bookings
      const manyBookings: Booking[] = Array.from({ length: 50 }, (_, i) => ({
        id: `booking-${i + 1}`,
        status: 'pending',
        booking_date: '2024-01-15',
        start_time: '10:00',
        end_time: '12:00',
        total_price: 1000,
        address: `${i + 1} Street`,
        city: 'Bangkok',
        state: 'Bangkok',
        zip_code: '10100',
        staff_id: 'staff-1',
        team_id: 'team-1',
        service_package_id: 'pkg-1',
        payment_status: 'unpaid',
        notes: null,
        customers: { id: `cust-${i + 1}`, full_name: `Customer ${i + 1}`, email: `customer${i + 1}@example.com` },
        service_packages: { name: 'Basic Cleaning', service_type: 'cleaning', price: 1000 },
        profiles: { full_name: 'Staff One' },
        teams: { name: 'Team A' },
      }))

      const queryKey = ['bookings']
      queryClient.setQueryData(queryKey, manyBookings)

      // Mock all RPC calls to succeed
      mockRpc.mockResolvedValue({ data: null, error: null })

      const onSuccess = vi.fn()
      const { result } = renderHook(
        () =>
          useBulkActions({
            bookings: manyBookings,
            filteredBookings: manyBookings,
            onSuccess,
          }),
        { wrapper }
      )

      // Select all 50 bookings
      act(() => {
        result.current.toggleSelectAll()
      })
      expect(result.current.selectedBookings).toHaveLength(50)

      const startTime = Date.now()

      // Delete all 50 bookings
      await act(async () => {
        await result.current.confirmBulkDelete()
      })

      const duration = Date.now() - startTime

      // Verify all 50 RPC calls were made
      expect(mockRpc).toHaveBeenCalledTimes(50)

      // Verify single toast (not 50 toasts)
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Archived 50 bookings successfully',
        })
      })

      // Performance assertion - should complete in reasonable time
      // (parallel calls should be much faster than sequential)
      expect(duration).toBeLessThan(5000) // 5 seconds max
    })
  })

  describe('Delete Confirmation Dialog', () => {
    it('should open confirmation dialog when handleBulkDelete is called', () => {
      const onSuccess = vi.fn()
      const { result } = renderHook(
        () =>
          useBulkActions({
            bookings: mockBookings,
            filteredBookings: mockBookings,
            onSuccess,
          }),
        { wrapper }
      )

      act(() => {
        result.current.toggleSelectBooking('booking-1')
      })

      expect(result.current.showDeleteConfirm).toBe(false)

      act(() => {
        result.current.handleBulkDelete()
      })

      expect(result.current.showDeleteConfirm).toBe(true)
    })

    it('should not open dialog when no bookings selected', () => {
      const onSuccess = vi.fn()
      const { result } = renderHook(
        () =>
          useBulkActions({
            bookings: mockBookings,
            filteredBookings: mockBookings,
            onSuccess,
          }),
        { wrapper }
      )

      act(() => {
        result.current.handleBulkDelete()
      })

      expect(result.current.showDeleteConfirm).toBe(false)
    })

    it('should track isDeleting state during deletion', async () => {
      const queryKey = ['bookings']
      queryClient.setQueryData(queryKey, mockBookings)

      // Mock RPC with delay
      mockRpc.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: null, error: null }), 100)
          })
      )

      const onSuccess = vi.fn()
      const { result } = renderHook(
        () =>
          useBulkActions({
            bookings: mockBookings,
            filteredBookings: mockBookings,
            onSuccess,
          }),
        { wrapper }
      )

      act(() => {
        result.current.toggleSelectBooking('booking-1')
      })

      expect(result.current.isDeleting).toBe(false)

      const deletePromise = act(async () => {
        await result.current.confirmBulkDelete()
      })

      // Should be deleting during operation
      await waitFor(() => {
        expect(result.current.isDeleting).toBe(true)
      })

      await deletePromise

      // Should be done after operation
      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false)
      })
    })
  })

  describe('Bulk Status Update', () => {
    it('should update status for multiple bookings', async () => {
      mockUpdate.mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: null }),
      })

      const onSuccess = vi.fn()
      const { result } = renderHook(
        () =>
          useBulkActions({
            bookings: mockBookings,
            filteredBookings: mockBookings,
            onSuccess,
          }),
        { wrapper }
      )

      act(() => {
        result.current.toggleSelectBooking('booking-1')
        result.current.toggleSelectBooking('booking-2')
        result.current.setBulkStatus('confirmed')
      })

      await act(async () => {
        await result.current.handleBulkStatusUpdate()
      })

      // Verify update called
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'confirmed' })

      // Verify success toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Success',
          })
        )
      })

      // Verify onSuccess called
      expect(onSuccess).toHaveBeenCalled()
    })
  })
})
