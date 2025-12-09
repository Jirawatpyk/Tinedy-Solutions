/**
 * useCustomers Hook
 *
 * Hook สำหรับโหลด Customers ด้วย React Query
 *
 * Features:
 * - ใช้ React Query สำหรับ caching และ data fetching
 * - Cache อัตโนมัติ 3 นาที
 * - รองรับ archived customers filter
 * - Shared cache ข้ามหน้าต่างๆ
 * - Realtime subscription support
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { customerQueryOptions, type CustomerWithBookingCount } from '@/lib/queries/customer-queries'

interface UseCustomersOptions {
  /** แสดง customers ที่ archived (soft-deleted) ด้วยหรือไม่ */
  showArchived?: boolean
  /** Enable realtime subscription หรือไม่ */
  enableRealtime?: boolean
}

interface UseCustomersReturn {
  /** รายการ customers ทั้งหมด (with booking_count) */
  customers: CustomerWithBookingCount[]
  /** กำลังโหลดหรือไม่ */
  loading: boolean
  /** Error message (ถ้ามี) */
  error: string | null
  /** Refresh customers manually */
  refresh: () => Promise<void>
}

/**
 * Hook สำหรับโหลด Customers ด้วย React Query
 *
 * @example
 * ```tsx
 * const { customers, loading, error, refresh } = useCustomers({
 *   showArchived: false,
 *   enableRealtime: true
 * })
 * ```
 */
export function useCustomers(options: UseCustomersOptions = {}): UseCustomersReturn {
  const { showArchived = false, enableRealtime = true } = options
  const queryClient = useQueryClient()

  // Fetch customers list
  const {
    data: customers = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery(customerQueryOptions.list(showArchived))

  // Realtime subscription - invalidate queries when customers change
  useEffect(() => {
    if (!enableRealtime) return

    console.log('[Customers] Setting up realtime subscription')

    const channel = supabase
      .channel('customers-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
        },
        (payload) => {
          console.log('[Customers] Customer changed:', payload.eventType)
          // Invalidate all customer queries to refetch
          queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
        }
      )
      .subscribe()

    return () => {
      console.log('[Customers] Cleanup subscription')
      supabase.removeChannel(channel)
    }
  }, [queryClient, enableRealtime])

  // Refresh function - refetch current query
  const refresh = async () => {
    await refetch()
  }

  return {
    customers,
    loading,
    error: error?.message || null,
    refresh,
  }
}
