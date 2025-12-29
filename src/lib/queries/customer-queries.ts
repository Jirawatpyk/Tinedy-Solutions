/**
 * Customer Query Functions
 *
 * React Query functions สำหรับ Customers
 *
 * Features:
 * - Automatic caching (3 minutes stale time)
 * - Support archived customers filter
 * - Shared cache across pages
 * - Type-safe query keys
 */

import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { CustomerRecord } from '@/types/customer'

/**
 * Customer with booking count for delete warning
 */
export interface CustomerWithBookingCount extends CustomerRecord {
  booking_count: number
}

/**
 * Fetch Customers List with booking count
 *
 * @param showArchived - Include archived (soft-deleted) customers
 * @returns Promise<CustomerWithBookingCount[]>
 */
export async function fetchCustomers(showArchived: boolean = false): Promise<CustomerWithBookingCount[]> {
  let query = supabase
    .from('customers')
    .select(`
      *,
      bookings:bookings(count)
    `)

  // Filter by archived status
  if (!showArchived) {
    query = query.is('deleted_at', null)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch customers: ${error.message}`)

  // Transform to add booking_count
  return (data || []).map(customer => ({
    ...customer,
    booking_count: customer.bookings?.[0]?.count || 0,
    bookings: undefined, // Remove raw bookings data
  })) as CustomerWithBookingCount[]
}

/**
 * Fetch Single Customer Detail
 *
 * @param id - Customer ID
 * @returns Promise<CustomerRecord>
 */
export async function fetchCustomerDetail(id: string): Promise<CustomerRecord> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch customer detail: ${error.message}`)

  return data
}

/**
 * Query Options สำหรับ Customers
 */
export const customerQueryOptions = {
  /**
   * List of all customers
   * staleTime: 0 - ทำให้ refetch ทันทีเมื่อ showArchived toggle (query key เปลี่ยน)
   * refetchOnMount: 'always' - บังคับ refetch เมื่อกลับมาจากหน้าอื่น (sync cross-user changes)
   */
  list: (showArchived: boolean = false) => ({
    queryKey: queryKeys.customers.list(showArchived),
    queryFn: () => fetchCustomers(showArchived),
    staleTime: 0, // Always stale - refetch ทันทีเมื่อ query key เปลี่ยน (showArchived toggle)
    refetchOnMount: 'always' as const, // บังคับ refetch ทุกครั้งที่ mount (sync cross-user changes)
  }),

  /**
   * Single customer detail
   */
  detail: (id: string) => ({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => fetchCustomerDetail(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  }),
}
