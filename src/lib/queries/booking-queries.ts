/**
 * Booking Query Functions
 *
 * React Query functions สำหรับ Bookings
 *
 * Features:
 * - Automatic caching (3 minutes stale time)
 * - Support archived bookings filter
 * - Shared cache across pages
 * - Type-safe query keys
 * - API response validation (Phase 7)
 */

import { keepPreviousData } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { TEAMS_WITH_LEAD_QUERY, transformTeamsData } from '@/lib/booking-utils'
import { BookingResponseSchema } from '@/schemas'
import type { Booking } from '@/types/booking'
import { z } from 'zod'

/**
 * Fetch Bookings List
 *
 * @param showArchived - Include archived (soft-deleted) bookings
 * @returns Promise<Booking[]>
 */
export async function fetchBookings(showArchived: boolean = false): Promise<Booking[]> {
  let query = supabase
    .from('bookings')
    .select(`
      *,
      customers (id, full_name, email),
      service_packages (name, service_type),
      service_packages_v2:package_v2_id (name, service_type),
      profiles!bookings_staff_id_fkey (full_name),
      ${TEAMS_WITH_LEAD_QUERY}
    `)

  // Filter by archived status
  if (!showArchived) {
    query = query.is('deleted_at', null)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch bookings: ${error.message}`)

  // Validate response data (Phase 7)
  try {
    const validatedData = z.array(BookingResponseSchema).parse(data || [])

    // Merge V1 and V2 package data into service_packages field for compatibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processedData = validatedData.map((booking: any) => ({
      ...booking,
      service_packages: booking.service_packages || booking.service_packages_v2,
      teams: transformTeamsData(booking.teams),
    }))

    return processedData as Booking[]
  } catch (validationError) {
    if (validationError instanceof z.ZodError) {
      console.error('Booking response validation failed:', validationError.issues)
      throw new Error(`Invalid booking data received from server: ${validationError.issues[0]?.message || 'Unknown validation error'}`)
    }
    throw validationError
  }
}

/**
 * Booking Filters for Date Range Query
 * Updated to support multi-select arrays (Sprint 2)
 */
export interface BookingFilters {
  // Legacy single-value filters (deprecated, kept for backward compatibility)
  viewMode?: 'staff' | 'team' | 'all'
  staffId?: string
  teamId?: string
  status?: string
  customerId?: string

  // New multi-select filters (Sprint 2)
  staffIds?: string[]
  teamIds?: string[]
  statuses?: string[]
  searchQuery?: string
}

/**
 * Fetch Bookings by Date Range
 *
 * ดึง bookings ตาม date range พร้อม filters (สำหรับ Calendar, Weekly Schedule)
 *
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param filters - Optional filters (viewMode, staffId, teamId, status)
 * @returns Promise<Booking[]>
 */
export async function fetchBookingsByDateRange(
  startDate: string,
  endDate: string,
  filters?: BookingFilters
): Promise<Booking[]> {
  let query = supabase
    .from('bookings')
    .select(`
      *,
      customers (id, full_name, email, phone),
      service_packages (name, service_type),
      service_packages_v2:package_v2_id (name, service_type),
      profiles!bookings_staff_id_fkey (full_name),
      ${TEAMS_WITH_LEAD_QUERY}
    `)
    .gte('booking_date', startDate)
    .lte('booking_date', endDate)
    .order('booking_date')
    .order('start_time')

  // Apply filters
  // Priority: New multi-select filters (Sprint 2) > Legacy single-value filters

  // Staff filters
  if (filters?.staffIds && filters.staffIds.length > 0) {
    // New multi-select: use .in() for array
    query = query.in('staff_id', filters.staffIds)
  } else if (filters?.viewMode === 'staff') {
    // Legacy viewMode filter
    query = query.not('staff_id', 'is', null)
    if (filters.staffId) {
      query = query.eq('staff_id', filters.staffId)
    }
  }

  // Team filters
  if (filters?.teamIds && filters.teamIds.length > 0) {
    // New multi-select: use .in() for array
    query = query.in('team_id', filters.teamIds)
  } else if (filters?.viewMode === 'team') {
    // Legacy viewMode filter
    query = query.not('team_id', 'is', null)
    if (filters.teamId) {
      query = query.eq('team_id', filters.teamId)
    }
  }

  // Status filters
  if (filters?.statuses && filters.statuses.length > 0) {
    // New multi-select: use .in() for array
    query = query.in('status', filters.statuses)
  } else if (filters?.status && filters.status !== 'all') {
    // Legacy single-value filter
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch bookings: ${error.message}`)

  // Validate response data (Phase 7)
  try {
    const validatedData = z.array(BookingResponseSchema).parse(data || [])

    // Process data - merge V1/V2 packages and transform teams
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let processedData = validatedData.map((booking: any) => ({
      ...booking,
      service_packages: booking.service_packages || booking.service_packages_v2,
      customers: Array.isArray(booking.customers) ? booking.customers[0] : booking.customers,
      profiles: Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles,
      teams: transformTeamsData(booking.teams),
    }))

    // Client-side search filtering (Sprint 2)
    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const searchLower = filters.searchQuery.toLowerCase().trim()
      console.log('🔍 Search Query:', searchLower)
      console.log('📊 Data before filter:', processedData.length)

      processedData = processedData.filter((booking: Booking) => {
        const customerName = booking.customers?.full_name?.toLowerCase() || ''
        const customerPhone = booking.customers?.phone?.toLowerCase() || ''
        const customerEmail = booking.customers?.email?.toLowerCase() || ''
        // รองรับทั้ง service_packages (V1) และ service_packages_v2 (V2)
        const serviceName = booking.service_packages?.name?.toLowerCase() ||
                          booking.service_packages_v2?.name?.toLowerCase() || ''
        const staffName = booking.profiles?.full_name?.toLowerCase() || ''
        const teamName = booking.teams?.name?.toLowerCase() || ''
        const bookingId = booking.id?.toLowerCase() || ''

        const matches = (
          customerName.includes(searchLower) ||
          customerPhone.includes(searchLower) ||
          customerEmail.includes(searchLower) ||
          serviceName.includes(searchLower) ||
          staffName.includes(searchLower) ||
          teamName.includes(searchLower) ||
          bookingId.includes(searchLower)
        )

        // Debug: แสดงข้อมูลของ booking แรก 3 ตัว
        if (processedData.indexOf(booking) < 3) {
          console.log('Checking booking:', booking.id?.slice(0, 8), {
            customerName,
            customerPhone,
            customerEmail,
            serviceName,
            staffName,
            teamName,
            matches
          })
        }

        return matches
      })

      console.log('✅ Data after filter:', processedData.length)
    }

    return processedData as Booking[]
  } catch (validationError) {
    if (validationError instanceof z.ZodError) {
      console.error('Booking response validation failed:', validationError.issues)
      throw new Error(`Invalid booking data received from server: ${validationError.issues[0]?.message || 'Unknown validation error'}`)
    }
    throw validationError
  }
}

/**
 * Fetch Bookings by Customer ID
 *
 * ดึง bookings ทั้งหมดของ customer คนใดคนหนึ่ง (สำหรับ Customer Detail page)
 *
 * @param customerId - Customer ID
 * @param showArchived - Include archived (soft-deleted) bookings
 * @returns Promise<Booking[]>
 */
export async function fetchBookingsByCustomer(
  customerId: string,
  showArchived: boolean = false
): Promise<Booking[]> {
  let query = supabase
    .from('bookings')
    .select(`
      *,
      customers (id, full_name, email, phone),
      service_packages (name, service_type, price),
      service_packages_v2:package_v2_id (name, service_type, base_price),
      profiles!bookings_staff_id_fkey (full_name),
      ${TEAMS_WITH_LEAD_QUERY}
    `)
    .eq('customer_id', customerId)
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false })

  // Filter by archived status
  if (!showArchived) {
    query = query.is('deleted_at', null)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch customer bookings: ${error.message}`)
  }

  // Validate and transform data
  try {
    const validatedData = z.array(BookingResponseSchema).parse(data || [])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processedData = validatedData.map((booking: any) => ({
      ...booking,
      service_packages: booking.service_packages || booking.service_packages_v2,
      teams: transformTeamsData(booking.teams),
    }))

    return processedData as Booking[]
  } catch (validationError) {
    if (validationError instanceof z.ZodError) {
      console.error('Customer bookings validation failed:', validationError.issues)
      throw new Error(`Invalid booking data: ${validationError.issues[0]?.message}`)
    }
    throw validationError
  }
}

/**
 * Fetch Single Booking Detail
 *
 * @param id - Booking ID
 * @returns Promise<Booking>
 */
export async function fetchBookingDetail(id: string): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customers (id, full_name, email, phone),
      service_packages (name, service_type, price),
      service_packages_v2:package_v2_id (name, service_type, base_price),
      profiles!bookings_staff_id_fkey (full_name),
      ${TEAMS_WITH_LEAD_QUERY}
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch booking detail: ${error.message}`)

  // Validate response data (Phase 7)
  try {
    const validatedData = BookingResponseSchema.parse(data)

    // Merge V1 and V2 package data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processedData: any = {
      ...validatedData,
      service_packages: validatedData.service_packages || validatedData.service_packages_v2,
      teams: transformTeamsData(validatedData.teams),
    }

    return processedData as Booking
  } catch (validationError) {
    if (validationError instanceof z.ZodError) {
      console.error('Booking detail validation failed:', validationError.issues)
      throw new Error(`Invalid booking detail data received from server: ${validationError.issues[0]?.message || 'Unknown validation error'}`)
    }
    throw validationError
  }
}

/**
 * Query Options สำหรับ Bookings
 */
export const bookingQueryOptions = {
  /**
   * List of all bookings
   */
  list: (showArchived: boolean = false) => ({
    queryKey: queryKeys.bookings.list(showArchived),
    queryFn: () => fetchBookings(showArchived),
    staleTime: 3 * 60 * 1000, // 3 minutes
  }),

  /**
   * Bookings by date range (for Calendar, Weekly Schedule)
   */
  byDateRange: (
    startDate: string,
    endDate: string,
    filters?: BookingFilters
  ) => {
    // Normalize filters เพื่อสร้าง stable query key
    // Sort arrays เพื่อให้ [1,2,3] และ [3,2,1] ได้ query key เดียวกัน
    const normalizedFilters = filters ? {
      staffIds: filters.staffIds?.length ? [...filters.staffIds].sort() : undefined,
      teamIds: filters.teamIds?.length ? [...filters.teamIds].sort() : undefined,
      statuses: filters.statuses?.length ? [...filters.statuses].sort() : undefined,
      searchQuery: filters.searchQuery?.trim() || undefined,
    } : undefined

    return {
      queryKey: queryKeys.bookings.byDateRange(startDate, endDate, normalizedFilters),
      queryFn: () => fetchBookingsByDateRange(startDate, endDate, filters), // Use original filters for query
      staleTime: 3 * 60 * 1000, // 3 minutes
      placeholderData: keepPreviousData, // Keep previous data while refetching (prevents UI flash)
    }
  },

  /**
   * Bookings by customer ID (for Customer Detail page)
   */
  byCustomer: (customerId: string, showArchived: boolean = false) => ({
    queryKey: queryKeys.bookings.byCustomer(customerId, showArchived),
    queryFn: () => fetchBookingsByCustomer(customerId, showArchived),
    staleTime: 3 * 60 * 1000, // 3 minutes
  }),

  /**
   * Single booking detail
   */
  detail: (id: string) => ({
    queryKey: queryKeys.bookings.detail(id),
    queryFn: () => fetchBookingDetail(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  }),
}
