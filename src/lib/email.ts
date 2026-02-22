import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Note: Email sending is handled by Edge Functions
// This avoids CORS issues and keeps API keys secure on the server

/** Extract a human-readable error message from Edge Function errors */
async function extractErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      return body?.error || error.message
    } catch {
      return error.message
    }
  }
  return error instanceof Error ? error.message : 'Unknown error'
}

// ============================================================================
// 1. BOOKING CONFIRMATION EMAIL
// Edge function is self-contained — fetches all data by bookingId
// ============================================================================
export async function sendBookingConfirmation({ bookingId }: { bookingId: string }) {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-booking-confirmation', {
      body: { bookingId }
    });
    if (error) throw error;
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send booking confirmation:', error);
    return { success: false, error: await extractErrorMessage(error) };
  }
}

// ============================================================================
// 2. BOOKING REMINDER EMAIL
// Edge function is self-contained — fetches all data by bookingId
// ============================================================================
export async function sendBookingReminder({ bookingId }: { bookingId: string }) {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-booking-reminder', {
      body: { bookingId }
    });
    if (error) throw error;
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send booking reminder:', error);
    return { success: false, error: await extractErrorMessage(error) };
  }
}

// ============================================================================
// 3. PAYMENT CONFIRMATION EMAIL
// Edge function handles both single and recurring bookings by bookingId
// ============================================================================
export async function sendPaymentConfirmation({ bookingId }: { bookingId: string }) {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-payment-confirmation', {
      body: { bookingId }
    });
    if (error) throw error;
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send payment confirmation:', error);
    return { success: false, error: await extractErrorMessage(error) };
  }
}

// ============================================================================
// 4. REFUND CONFIRMATION EMAIL
// ============================================================================
export async function sendRefundConfirmation({ bookingId }: { bookingId: string }) {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-refund-confirmation', {
      body: { bookingId }
    });
    if (error) throw error;
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send refund confirmation:', error);
    return { success: false, error: await extractErrorMessage(error) };
  }
}

// ============================================================================
// 5. RECURRING BOOKING CONFIRMATION EMAIL
// Edge function is self-contained — fetches all sessions by bookingId (primary)
// ============================================================================
export async function sendRecurringBookingConfirmation({ bookingId }: { bookingId: string }) {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-recurring-booking-confirmation', {
      body: { bookingId }
    });
    if (error) throw error;
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send recurring booking confirmation:', error);
    return { success: false, error: await extractErrorMessage(error) };
  }
}
