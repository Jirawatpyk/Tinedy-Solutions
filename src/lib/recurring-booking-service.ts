/**
 * Recurring Booking Service
 *
 * Service สำหรับจัดการ CRUD operations ของ recurring bookings
 */

import { supabase } from './supabase'
import type {
  RecurringGroupInput,
  RecurringCreationResult,
  RecurringEditRequest,
  RecurringEditScope,
  RecurringBookingRecord,
  RecurringGroup
} from '@/types/recurring-booking'
import {
  generateRecurringGroupId,
  getRecurringSequence,
  sortRecurringGroup
} from './recurring-utils'

/**
 * สร้าง Recurring Booking Group ใหม่
 *
 * Function นี้จะสร้าง booking หลายครั้งพร้อมกัน โดยทุก booking มี recurring_group_id เดียวกัน
 * Booking แรกจะเป็น parent (parent_booking_id = null)
 * Bookings ที่เหลือจะ reference ไปยัง parent
 *
 * หากการสร้างล้มเหลวบางครั้ง จะทำ rollback ทั้งหมด
 *
 * @param input - ข้อมูลสำหรับสร้าง recurring group
 * @param input.baseBooking - ข้อมูล booking พื้นฐานที่ใช้เป็น template
 * @param input.pattern - รูปแบบการเกิดซ้ำ (auto-weekly, auto-biweekly, custom)
 * @param input.totalOccurrences - จำนวนครั้งทั้งหมด (ต้องตรงกับ frequency)
 * @param input.dates - Array ของวันที่ทั้งหมด (ISO format)
 *
 * @returns Promise<RecurringCreationResult>
 *   - success: boolean - สถานะความสำเร็จ
 *   - groupId: string - recurring_group_id ที่สร้าง
 *   - bookingIds: string[] - Array ของ booking IDs ที่สร้างสำเร็จ
 *   - errors?: string[] - Array ของ error messages (ถ้ามี)
 *
 * @example
 * ```typescript
 * const result = await createRecurringGroup({
 *   baseBooking: {
 *     customer_id: 'uuid-123',
 *     service_package_id: 'uuid-456',
 *     start_time: '09:00:00',
 *     end_time: '12:00:00',
 *     status: 'pending',
 *     total_price: 3200,
 *     area_sqm: 100,
 *     frequency: 4
 *   },
 *   pattern: 'auto-weekly',
 *   totalOccurrences: 4,
 *   dates: ['2025-01-15', '2025-01-22', '2025-01-29', '2025-02-05']
 * })
 *
 * if (result.success) {
 *   console.log(`Created ${result.bookingIds.length} bookings`)
 * }
 * ```
 *
 * @throws จะไม่ throw error แต่จะ return error ใน result.errors
 */
export async function createRecurringGroup(
  input: RecurringGroupInput
): Promise<RecurringCreationResult> {
  const groupId = generateRecurringGroupId()
  const bookingIds: string[] = []
  const errors: string[] = []

  try {
    console.log('🔄 Creating recurring group:', {
      groupId,
      pattern: input.pattern,
      totalOccurrences: input.totalOccurrences,
      dates: input.dates
    })

    // สร้าง booking แรก (parent)
    const parentBooking = {
      ...input.baseBooking,
      booking_date: input.dates[0],
      recurring_group_id: groupId,
      recurring_sequence: 1,
      recurring_total: input.totalOccurrences,
      recurring_pattern: input.pattern,
      is_recurring: true,
      parent_booking_id: null
    }

    const { data: parent, error: parentError } = await supabase
      .from('bookings')
      .insert(parentBooking)
      .select('id')
      .single()

    if (parentError) {
      console.error('❌ Error creating parent booking:', parentError)
      throw parentError
    }
    if (!parent) {
      throw new Error('Failed to create parent booking')
    }

    const parentId = parent.id
    bookingIds.push(parentId)
    console.log('✅ Created parent booking:', parentId)

    // สร้าง bookings ที่เหลือ
    if (input.dates.length > 1) {
      const childBookings = input.dates.slice(1).map((date, index) => ({
        ...input.baseBooking,
        booking_date: date,
        recurring_group_id: groupId,
        recurring_sequence: getRecurringSequence(index + 1),
        recurring_total: input.totalOccurrences,
        recurring_pattern: input.pattern,
        is_recurring: true,
        parent_booking_id: parentId
      }))

      const { data: children, error: childError } = await supabase
        .from('bookings')
        .insert(childBookings)
        .select('id')

      if (childError) {
        console.error('❌ Error creating child bookings:', childError)
        throw childError
      }
      if (children) {
        const childIds = children.map(c => c.id)
        bookingIds.push(...childIds)
        console.log(`✅ Created ${childIds.length} child bookings`)
      }
    }

    console.log('✅ Successfully created recurring group:', {
      groupId,
      totalBookings: bookingIds.length
    })

    return {
      success: true,
      groupId,
      bookingIds
    }
  } catch (error) {
    console.error('❌ Error creating recurring group:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    errors.push(errorMessage)

    // Rollback: ลบ bookings ที่สร้างไปแล้ว
    if (bookingIds.length > 0) {
      console.log('🔄 Rolling back bookings:', bookingIds)
      await supabase
        .from('bookings')
        .delete()
        .in('id', bookingIds)
      console.log('✅ Rollback complete')
    }

    return {
      success: false,
      groupId,
      bookingIds: [],
      errors
    }
  }
}

/**
 * แก้ไข Recurring Bookings ตาม scope
 *
 * @param request - ข้อมูลการแก้ไข พร้อม scope
 * @returns Result พร้อมจำนวน bookings ที่แก้ไข
 *
 * @example
 * ```typescript
 * const result = await updateRecurringBookings({
 *   bookingId: 'uuid-123',
 *   scope: 'this_and_future',
 *   updates: { start_time: '10:00:00' }
 * })
 * ```
 */
export async function updateRecurringBookings(
  request: RecurringEditRequest
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  const { bookingId, scope, updates } = request

  try {
    console.log('🔄 Updating recurring bookings:', {
      bookingId,
      scope,
      updates
    })

    // ดึงข้อมูล booking ปัจจุบัน
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('recurring_group_id, recurring_sequence, is_recurring')
      .eq('id', bookingId)
      .single()

    if (fetchError) throw fetchError
    if (!booking) throw new Error('Booking not found')
    if (!booking.is_recurring) throw new Error('Booking is not recurring')

    let query

    switch (scope) {
      case 'this_only':
        // แก้ไขเฉพาะ booking นี้
        query = supabase
          .from('bookings')
          .update(updates)
          .eq('id', bookingId)
        break

      case 'this_and_future':
        // แก้ไขครั้งนี้และครั้งถัดไป
        if (!booking.recurring_group_id) {
          throw new Error('Booking is not part of a recurring group')
        }

        query = supabase
          .from('bookings')
          .update(updates)
          .eq('recurring_group_id', booking.recurring_group_id)
          .gte('recurring_sequence', booking.recurring_sequence)
        break

      case 'all':
        // แก้ไขทั้งหมดในกลุ่ม
        if (!booking.recurring_group_id) {
          throw new Error('Booking is not part of a recurring group')
        }

        query = supabase
          .from('bookings')
          .update(updates)
          .eq('recurring_group_id', booking.recurring_group_id)
        break

      default:
        throw new Error(`Invalid scope: ${scope}`)
    }

    const { error: updateError, count } = await query

    if (updateError) throw updateError

    console.log(`✅ Updated ${count || 0} bookings`)

    return {
      success: true,
      updatedCount: count || 0
    }
  } catch (error) {
    console.error('❌ Error updating recurring bookings:', error)
    return {
      success: false,
      updatedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * ลบ Recurring Bookings ตาม scope
 *
 * @param bookingId - ID ของ booking ที่จะลบ
 * @param scope - ขอบเขตการลบ
 * @returns Result พร้อมจำนวน bookings ที่ลบ
 *
 * @example
 * ```typescript
 * const result = await deleteRecurringBookings('uuid-123', 'all')
 * ```
 */
export async function deleteRecurringBookings(
  bookingId: string,
  scope: RecurringEditScope
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    console.log('🔄 Deleting recurring bookings:', {
      bookingId,
      scope
    })

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('recurring_group_id, recurring_sequence, is_recurring')
      .eq('id', bookingId)
      .single()

    if (fetchError) throw fetchError
    if (!booking) throw new Error('Booking not found')
    if (!booking.is_recurring) throw new Error('Booking is not recurring')

    let query

    switch (scope) {
      case 'this_only':
        query = supabase
          .from('bookings')
          .delete({ count: 'exact' })
          .eq('id', bookingId)
        break

      case 'this_and_future':
        if (!booking.recurring_group_id) {
          throw new Error('Booking is not part of a recurring group')
        }

        query = supabase
          .from('bookings')
          .delete({ count: 'exact' })
          .eq('recurring_group_id', booking.recurring_group_id)
          .gte('recurring_sequence', booking.recurring_sequence)
        break

      case 'all':
        if (!booking.recurring_group_id) {
          throw new Error('Booking is not part of a recurring group')
        }

        query = supabase
          .from('bookings')
          .delete({ count: 'exact' })
          .eq('recurring_group_id', booking.recurring_group_id)
        break

      default:
        throw new Error(`Invalid scope: ${scope}`)
    }

    const { error: deleteError, count } = await query

    if (deleteError) throw deleteError

    console.log(`✅ Deleted ${count || 0} bookings`)

    return {
      success: true,
      deletedCount: count || 0
    }
  } catch (error) {
    console.error('❌ Error deleting recurring bookings:', error)
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * ดึงข้อมูล Recurring Group พร้อม bookings ทั้งหมด
 *
 * @param groupId - recurring_group_id
 * @returns RecurringGroup object พร้อมสถิติ
 *
 * @example
 * ```typescript
 * const group = await getRecurringGroup('uuid-123')
 * if (group) {
 *   console.log(`Total: ${group.totalBookings}`)
 *   console.log(`Completed: ${group.completedCount}`)
 * }
 * ```
 */
export async function getRecurringGroup(
  groupId: string
): Promise<RecurringGroup | null> {
  try {
    console.log('🔄 Fetching recurring group:', groupId)

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customers (
          full_name,
          email
        ),
        service_packages (
          name,
          service_type
        ),
        service_packages_v2 (
          name,
          service_type
        )
      `)
      .eq('recurring_group_id', groupId)
      .order('recurring_sequence')

    if (error) throw error
    if (!data || data.length === 0) {
      console.log('❌ Recurring group not found')
      return null
    }

    const bookings = data as RecurringBookingRecord[]
    const sorted = sortRecurringGroup(bookings)

    const group: RecurringGroup = {
      groupId,
      pattern: sorted[0].recurring_pattern || 'custom',
      totalBookings: sorted[0].recurring_total || 0,
      bookings: sorted,
      completedCount: sorted.filter(b => b.status === 'completed').length,
      cancelledCount: sorted.filter(b => b.status === 'cancelled').length,
      upcomingCount: sorted.filter(b =>
        b.status !== 'completed' && b.status !== 'cancelled'
      ).length
    }

    console.log('✅ Fetched recurring group:', {
      groupId,
      totalBookings: group.totalBookings,
      completed: group.completedCount,
      upcoming: group.upcomingCount
    })

    return group
  } catch (error) {
    console.error('❌ Error fetching recurring group:', error)
    return null
  }
}

/**
 * ตรวจสอบว่ามี recurring group อยู่หรือไม่
 */
export async function recurringGroupExists(groupId: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('recurring_group_id', groupId)

    if (error) throw error

    return (count || 0) > 0
  } catch (error) {
    console.error('❌ Error checking recurring group existence:', error)
    return false
  }
}
