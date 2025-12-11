/**
 * Payment Service
 *
 * Centralized service สำหรับจัดการ payment operations
 * - verifyPayment: ยืนยันการชำระเงิน (pending_verification → paid)
 * - markAsPaid: เปลี่ยนสถานะเป็นจ่ายแล้ว (unpaid → paid)
 * - requestRefund: ขอคืนเงิน (paid → refund_pending)
 * - completeRefund: ยืนยันคืนเงินแล้ว (refund_pending → refunded)
 * - cancelRefund: ยกเลิกการขอคืนเงิน (refund_pending → paid)
 *
 * รองรับทั้ง single และ recurring bookings
 * ส่ง payment confirmation email อัตโนมัติ
 */

import { supabase } from '@/lib/supabase'
import { getBangkokDateString } from '@/lib/utils'

// ===== Types =====

export interface VerifyPaymentOptions {
  bookingId: string
  recurringGroupId?: string | null
  sendEmail?: boolean // default: true
}

export interface MarkAsPaidOptions {
  bookingId: string
  recurringGroupId?: string | null
  paymentMethod?: string // default: 'cash'
  amount?: number
  sendEmail?: boolean // default: true
}

export interface RefundOptions {
  bookingId: string
  recurringGroupId?: string | null
  sendEmail?: boolean // default: true for completeRefund
}

export interface PaymentResult {
  success: boolean
  count: number
  error?: string
}

// ===== Helper Functions =====

/**
 * ส่ง payment confirmation email
 * ไม่ throw error - payment ยังถือว่าสำเร็จแม้ส่ง email ไม่ได้
 */
async function sendPaymentConfirmationEmail(bookingId: string): Promise<void> {
  try {
    await supabase.functions.invoke('send-payment-confirmation', {
      body: { bookingId },
    })
  } catch (error) {
    console.warn('Failed to send payment confirmation email:', error)
    // Don't throw - payment is still successful
  }
}

/**
 * ส่ง refund confirmation email
 * ไม่ throw error - refund ยังถือว่าสำเร็จแม้ส่ง email ไม่ได้
 */
async function sendRefundConfirmationEmail(bookingId: string): Promise<void> {
  try {
    await supabase.functions.invoke('send-refund-confirmation', {
      body: { bookingId },
    })
  } catch (error) {
    console.warn('Failed to send refund confirmation email:', error)
    // Don't throw - refund is still successful
  }
}

// ===== Main Functions =====

/**
 * Verify Payment
 *
 * ใช้เมื่อ admin ตรวจสอบสลิปแล้ว confirm ว่าถูกต้อง
 * เปลี่ยน payment_status จาก 'pending_verification' → 'paid'
 *
 * @param options - VerifyPaymentOptions
 * @returns PaymentResult
 */
export async function verifyPayment(
  options: VerifyPaymentOptions
): Promise<PaymentResult> {
  const { bookingId, recurringGroupId, sendEmail = true } = options

  const updateData = {
    payment_status: 'paid' as const,
    payment_date: getBangkokDateString(),
  }

  let count = 1

  try {
    if (recurringGroupId) {
      // Update all bookings in recurring group
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('recurring_group_id', recurringGroupId)

      if (error) {
        return { success: false, count: 0, error: error.message }
      }

      // Count updated bookings
      const { count: updatedCount } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('recurring_group_id', recurringGroupId)

      count = updatedCount || 1
    } else {
      // Update single booking
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)

      if (error) {
        return { success: false, count: 0, error: error.message }
      }
    }

    // Send email
    if (sendEmail) {
      await sendPaymentConfirmationEmail(bookingId)
    }

    return { success: true, count }
  } catch (error) {
    console.error('Error in verifyPayment:', error)
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Mark as Paid
 *
 * ใช้เมื่อ admin กด mark ว่าลูกค้าจ่ายแล้ว (cash, transfer, etc.)
 * เปลี่ยน payment_status จาก 'unpaid' → 'paid'
 *
 * @param options - MarkAsPaidOptions
 * @returns PaymentResult
 */
export async function markAsPaid(
  options: MarkAsPaidOptions
): Promise<PaymentResult> {
  const {
    bookingId,
    recurringGroupId,
    paymentMethod = 'cash',
    amount,
    sendEmail = true,
  } = options

  const updateData: Record<string, unknown> = {
    payment_status: 'paid' as const,
    payment_method: paymentMethod,
    payment_date: getBangkokDateString(),
  }

  // เพิ่ม amount_paid ถ้ามี
  if (amount !== undefined) {
    updateData.amount_paid = amount
  }

  let count = 1

  try {
    if (recurringGroupId) {
      // Update all bookings in recurring group
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('recurring_group_id', recurringGroupId)

      if (error) {
        return { success: false, count: 0, error: error.message }
      }

      // Count updated bookings
      const { count: updatedCount } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('recurring_group_id', recurringGroupId)

      count = updatedCount || 1
    } else {
      // Update single booking
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)

      if (error) {
        return { success: false, count: 0, error: error.message }
      }
    }

    // Send email
    if (sendEmail) {
      await sendPaymentConfirmationEmail(bookingId)
    }

    return { success: true, count }
  } catch (error) {
    console.error('Error in markAsPaid:', error)
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Request Refund
 *
 * ใช้เมื่อต้องการขอคืนเงิน
 * เปลี่ยน payment_status จาก 'paid' → 'refund_pending'
 *
 * @param options - RefundOptions
 * @returns PaymentResult
 */
export async function requestRefund(
  options: RefundOptions
): Promise<PaymentResult> {
  const { bookingId, recurringGroupId } = options

  const updateData = {
    payment_status: 'refund_pending' as const,
  }

  let count = 1

  try {
    if (recurringGroupId) {
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('recurring_group_id', recurringGroupId)

      if (error) {
        return { success: false, count: 0, error: error.message }
      }

      const { count: updatedCount } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('recurring_group_id', recurringGroupId)

      count = updatedCount || 1
    } else {
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)

      if (error) {
        return { success: false, count: 0, error: error.message }
      }
    }

    return { success: true, count }
  } catch (error) {
    console.error('Error in requestRefund:', error)
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Complete Refund
 *
 * ใช้เมื่อคืนเงินสำเร็จแล้ว
 * เปลี่ยน payment_status จาก 'refund_pending' → 'refunded'
 * ส่ง refund confirmation email อัตโนมัติ
 *
 * @param options - RefundOptions
 * @returns PaymentResult
 */
export async function completeRefund(
  options: RefundOptions
): Promise<PaymentResult> {
  const { bookingId, recurringGroupId, sendEmail = true } = options

  const updateData = {
    payment_status: 'refunded' as const,
  }

  let count = 1

  try {
    if (recurringGroupId) {
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('recurring_group_id', recurringGroupId)

      if (error) {
        return { success: false, count: 0, error: error.message }
      }

      const { count: updatedCount } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('recurring_group_id', recurringGroupId)

      count = updatedCount || 1
    } else {
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)

      if (error) {
        return { success: false, count: 0, error: error.message }
      }
    }

    // Send refund confirmation email
    if (sendEmail) {
      await sendRefundConfirmationEmail(bookingId)
    }

    return { success: true, count }
  } catch (error) {
    console.error('Error in completeRefund:', error)
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Cancel Refund
 *
 * ใช้เมื่อต้องการยกเลิกการขอคืนเงิน
 * เปลี่ยน payment_status จาก 'refund_pending' → 'paid'
 *
 * @param options - RefundOptions
 * @returns PaymentResult
 */
export async function cancelRefund(
  options: RefundOptions
): Promise<PaymentResult> {
  const { bookingId, recurringGroupId } = options

  const updateData = {
    payment_status: 'paid' as const,
  }

  let count = 1

  try {
    if (recurringGroupId) {
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('recurring_group_id', recurringGroupId)

      if (error) {
        return { success: false, count: 0, error: error.message }
      }

      const { count: updatedCount } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('recurring_group_id', recurringGroupId)

      count = updatedCount || 1
    } else {
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)

      if (error) {
        return { success: false, count: 0, error: error.message }
      }
    }

    return { success: true, count }
  } catch (error) {
    console.error('Error in cancelRefund:', error)
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
