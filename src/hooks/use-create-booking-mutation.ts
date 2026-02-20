/**
 * useCreateBookingMutation — TanStack Mutation hook for booking creation
 *
 * Replaces the API-layer logic from old use-booking-create.ts.
 * Handles both single and recurring bookings, plus new customer creation.
 *
 * Features:
 * - Atomic new-customer flow: create customer → get ID → create booking
 *   (FM2-A: if customer creation fails, booking is NOT created)
 * - FM2-B: Duplicate customers (same phone) are NOT blocked at app layer.
 *   Business decision: admin is responsible for deduplication.
 * - On success: invalidates bookings queries + customers query
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/error-utils'
import { BookingStatus, PaymentStatus, type PriceMode } from '@/types/booking'
import { RecurringPattern } from '@/types/recurring-booking'
import { createRecurringGroup } from '@/lib/recurring-booking-service'

// ============================================================================
// TYPES
// ============================================================================

export interface NewCustomerData {
  full_name: string
  phone: string
  email?: string
}

export interface BookingInsertData {
  // Customer — one of these must be set
  customer_id?: string
  isNewCustomer?: boolean
  newCustomerData?: NewCustomerData

  // Date & Time
  booking_date: string        // YYYY-MM-DD
  end_date?: string | null    // YYYY-MM-DD, null = single-day
  start_time: string          // HH:MM
  end_time?: string           // HH:MM

  // Package & Pricing
  package_v2_id?: string | null
  price_mode?: PriceMode
  total_price: number
  custom_price?: number | null
  price_override?: boolean
  job_name?: string | null
  area_sqm?: number | null
  frequency?: 1 | 2 | 4 | 8 | null

  // Assignment (staff OR team, not both)
  staff_id?: string | null
  team_id?: string | null

  // Location
  address: string
  city: string
  state?: string
  zip_code?: string

  // Extras
  notes?: string

  // Recurring (if batch creation)
  recurring_dates?: string[]       // Multiple dates for recurring
  recurring_pattern?: string
}

export interface CreateBookingResult {
  bookingIds: string[]
  customerId: string
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function createCustomer(data: NewCustomerData): Promise<string> {
  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      full_name: data.full_name,
      phone: data.phone,
      email: data.email || '',
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create customer: ${getErrorMessage(error)}`)
  return customer.id
}

async function createSingleBooking(
  customerId: string,
  data: BookingInsertData,
  bookingDate: string
): Promise<string> {
  const payload = {
    customer_id: customerId,
    booking_date: bookingDate,
    end_date: data.end_date ?? null,
    start_time: data.start_time,
    end_time: data.end_time || null,
    package_v2_id: data.package_v2_id ?? null,
    price_mode: data.price_mode ?? 'package',
    total_price: data.total_price,
    custom_price: data.custom_price ?? null,
    price_override: data.price_override ?? false,
    job_name: data.job_name ?? null,
    area_sqm: data.area_sqm ?? null,
    frequency: data.frequency ?? null,
    staff_id: data.staff_id ?? null,
    team_id: data.team_id ?? null,
    address: data.address,
    city: data.city,
    state: data.state ?? null,
    zip_code: data.zip_code ?? null,
    notes: data.notes ?? null,
    status: BookingStatus.Pending,
    payment_status: PaymentStatus.Unpaid,
    payment_method: null,
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert(payload)
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create booking: ${getErrorMessage(error)}`)
  return booking.id
}

async function createBookingMutation(data: BookingInsertData): Promise<CreateBookingResult> {
  // Step 1: Resolve customer ID
  let customerId: string

  if (data.isNewCustomer && data.newCustomerData) {
    // FM2-A: Atomic — create customer first, then booking
    customerId = await createCustomer(data.newCustomerData)
  } else if (data.customer_id) {
    customerId = data.customer_id
  } else {
    throw new Error('Please select a customer or enter new customer details')
  }

  // Step 2: Create booking(s)
  const bookingIds: string[] = []

  if (data.recurring_dates && data.recurring_dates.length > 0) {
    // Recurring booking — use createRecurringGroup() for proper linking
    // Manual mode: recurringDates = ALL dates (no separate primary)
    // Auto-monthly mode: booking_date (primary) + recurringDates (future)
    const allDates =
      data.recurring_pattern === 'manual'
        ? [...data.recurring_dates].sort()
        : [data.booking_date, ...data.recurring_dates].sort()

    const pattern =
      data.recurring_pattern === 'manual'
        ? RecurringPattern.Custom
        : RecurringPattern.AutoMonthly

    // Split price per booking: total_price is the package total for all sessions
    const perBookingPrice = Math.round(data.total_price / allDates.length)
    const perBookingCustomPrice = data.custom_price != null
      ? Math.round(data.custom_price / allDates.length)
      : null

    const result = await createRecurringGroup({
      baseBooking: {
        customer_id: customerId,
        start_time: data.start_time,
        end_time: data.end_time || null,
        status: BookingStatus.Pending,
        payment_status: PaymentStatus.Unpaid,
        total_price: perBookingPrice,
        address: data.address,
        city: data.city,
        state: data.state ?? null,
        zip_code: data.zip_code ?? null,
        package_v2_id: data.package_v2_id ?? null,
        // V2 pricing fields — preserve override/custom mode in recurring bookings
        price_mode: data.price_mode ?? 'package',
        custom_price: perBookingCustomPrice,
        price_override: data.price_override ?? false,
        job_name: data.job_name ?? null,
        staff_id: data.staff_id ?? null,
        team_id: data.team_id ?? null,
        notes: data.notes ?? null,
        area_sqm: data.area_sqm ?? null,
        frequency: data.frequency ?? null,
        payment_method: null,
      },
      pattern,
      totalOccurrences: allDates.length,
      dates: allDates,
    })

    if (!result.success) {
      throw new Error(result.errors?.[0] ?? 'Failed to create recurring bookings')
    }
    bookingIds.push(...result.bookingIds)
  } else {
    // Single booking
    try {
      const id = await createSingleBooking(customerId, data, data.booking_date)
      bookingIds.push(id)
    } catch (error) {
      if (bookingIds.length > 0) {
        const { error: rollbackError } = await supabase
          .from('bookings')
          .delete()
          .in('id', bookingIds)
        if (rollbackError) {
          console.error('[useCreateBookingMutation] Rollback failed:', bookingIds, rollbackError)
        }
      }
      throw error
    }
  }

  return { bookingIds, customerId }
}

// ============================================================================
// HOOK
// ============================================================================

export function useCreateBookingMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createBookingMutation,
    onSuccess: (_data, variables) => {
      // Invalidate all bookings queries
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })

      // If new customer was created, invalidate customers too
      if (variables.isNewCustomer) {
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
      }
    },
  })
}
