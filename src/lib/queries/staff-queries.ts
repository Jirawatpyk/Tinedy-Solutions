/**
 * Staff Query Functions
 *
 * React Query functions สำหรับ Staff
 *
 * Features:
 * - Automatic caching (3-5 minutes stale time)
 * - Support with/without ratings
 * - Shared cache across pages
 * - Type-safe query keys
 */

import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { StaffWithRating, StaffListItem } from '@/types/staff'

/**
 * Fetch Staff List with Ratings
 *
 * ดึง staff ทั้งหมด (admin, manager, staff) พร้อม average rating
 * ใช้สำหรับหน้า Staff management
 *
 * @returns Promise<StaffWithRating[]>
 */
export async function fetchStaffWithRatings(): Promise<StaffWithRating[]> {
  // Fetch profiles
  const { data: staffData, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, role, phone, staff_number, skills, created_at, updated_at')
    .in('role', ['admin', 'manager', 'staff'])
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch staff: ${error.message}`)
  if (!staffData || staffData.length === 0) return []

  // Fetch ratings for all staff
  const staffIds = staffData.map((s) => s.id)

  interface ReviewData {
    rating: number
    bookings: { staff_id: string } | { staff_id: string }[]
  }

  const { data: ratingsData } = await supabase
    .from('reviews')
    .select('rating, bookings!inner(staff_id)')
    .in('bookings.staff_id', staffIds)

  // Group ratings by staff_id
  const staffRatings: Record<string, number[]> = {}

  ratingsData?.forEach((review: ReviewData) => {
    const bookings = Array.isArray(review.bookings) ? review.bookings[0] : review.bookings
    const staffId = bookings?.staff_id
    if (staffId) {
      if (!staffRatings[staffId]) {
        staffRatings[staffId] = []
      }
      staffRatings[staffId].push(review.rating)
    }
  })

  // Calculate average rating for each staff
  const staffWithRatings: StaffWithRating[] = staffData.map((staff) => {
    const ratings = staffRatings[staff.id]
    if (ratings && ratings.length > 0) {
      const average = ratings.reduce((a, b) => a + b, 0) / ratings.length
      return { ...staff, average_rating: average } as StaffWithRating
    }
    return staff as StaffWithRating
  })

  return staffWithRatings
}

/**
 * Fetch Staff List (Simple - for dropdowns)
 *
 * ดึง staff แบบ minimal data สำหรับ dropdowns ใน Dashboard, Bookings, Calendar
 *
 * @param role - Filter by role: 'staff' | 'all'
 * @returns Promise<StaffListItem[]>
 */
export async function fetchStaffList(role: 'staff' | 'all' = 'all'): Promise<StaffListItem[]> {
  let query = supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')

  // Filter by role
  if (role === 'staff') {
    query = query.eq('role', 'staff')
  } else {
    query = query.in('role', ['admin', 'manager', 'staff'])
  }

  const { data, error } = await query.order('full_name', { ascending: true })

  if (error) throw new Error(`Failed to fetch staff list: ${error.message}`)

  return (data || []) as StaffListItem[]
}

/**
 * Fetch Single Staff Detail
 *
 * ดึงข้อมูล staff คนเดียวพร้อม rating
 *
 * @param id - Staff ID
 * @returns Promise<StaffWithRating>
 */
export async function fetchStaffDetail(id: string): Promise<StaffWithRating> {
  // Fetch profile
  const { data: staff, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, role, phone, staff_number, skills, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch staff detail: ${error.message}`)

  // Fetch ratings for this staff
  interface ReviewData {
    rating: number
  }

  const { data: ratingsData } = await supabase
    .from('reviews')
    .select('rating, bookings!inner(staff_id)')
    .eq('bookings.staff_id', id)

  // Calculate average rating
  if (ratingsData && ratingsData.length > 0) {
    const ratings = ratingsData.map((r: ReviewData) => r.rating)
    const average = ratings.reduce((a, b) => a + b, 0) / ratings.length
    return { ...staff, average_rating: average } as StaffWithRating
  }

  return staff as StaffWithRating
}

/**
 * Query Options สำหรับ Staff
 */
export const staffQueryOptions = {
  /**
   * Staff list with ratings (for Staff management page)
   */
  withRatings: () => ({
    queryKey: queryKeys.staff.withRatings(),
    queryFn: () => fetchStaffWithRatings(),
    staleTime: 3 * 60 * 1000, // 3 minutes
  }),

  /**
   * Simple staff list (for dropdowns)
   */
  listSimple: (role: 'staff' | 'all' = 'all') => ({
    queryKey: queryKeys.staff.listSimple(role),
    queryFn: () => fetchStaffList(role),
    staleTime: 5 * 60 * 1000, // 5 minutes (reference data)
  }),

  /**
   * Single staff detail
   */
  detail: (id: string) => ({
    queryKey: queryKeys.staff.detail(id),
    queryFn: () => fetchStaffDetail(id),
    staleTime: 3 * 60 * 1000, // 3 minutes
  }),
}
