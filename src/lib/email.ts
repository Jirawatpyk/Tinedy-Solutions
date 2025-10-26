import { supabase } from './supabase';

// Shared interfaces
export interface BookingEmailData {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  location?: string;
  notes?: string;
  staffName?: string;
}

export interface PaymentEmailData extends BookingEmailData {
  paymentLink: string;
}

// Queue email in database
async function queueEmail(
  bookingId: string,
  emailType: string,
  recipientEmail: string,
  recipientName: string,
  subject: string,
  htmlContent: string,
  scheduledAt?: Date
) {
  try {
    const { error } = await supabase.from('email_queue').insert({
      booking_id: bookingId,
      email_type: emailType,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      subject,
      html_content: htmlContent,
      scheduled_at: scheduledAt?.toISOString(),
      status: 'pending',
    });

    if (error) {
      console.error('Failed to queue email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error queuing email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Note: Email sending is now handled by Edge Functions
// This avoids CORS issues and keeps API keys secure on the server

// ============================================================================
// 1. BOOKING CONFIRMATION EMAIL
// ============================================================================
export async function sendBookingConfirmation(data: PaymentEmailData) {
  try {
    // Call Edge Function instead of sending directly from browser
    const { data: result, error } = await supabase.functions.invoke('send-booking-confirmation', {
      body: data
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    // Queue email for tracking
    await queueEmail(
      data.bookingId,
      'booking_confirmation',
      data.customerEmail,
      data.customerName,
      `Booking Confirmed - ${data.serviceName}`,
      '', // HTML not needed as Edge Function handles it
    );

    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send booking confirmation:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// 2. PAYMENT LINK EMAIL
// ============================================================================
export async function sendPaymentLink(data: PaymentEmailData) {
  // Queue email for tracking
  await queueEmail(
    data.bookingId,
    'payment_link',
    data.customerEmail,
    data.customerName,
    `Payment Required - ${data.serviceName}`,
    '', // HTML handled by template
  );

  // Note: This should be sent via Edge Function in production
  console.log('Payment link email queued for:', data.customerEmail);
  return { success: true };
}

// ============================================================================
// 3. PAYMENT CONFIRMATION EMAIL
// ============================================================================
export async function sendPaymentConfirmation(data: BookingEmailData) {
  // Queue email for tracking
  await queueEmail(
    data.bookingId,
    'payment_confirmation',
    data.customerEmail,
    data.customerName,
    `Payment Confirmed - ${data.serviceName}`,
    '',
  );

  // Note: This should be sent via Edge Function in production
  console.log('Payment confirmation email queued for:', data.customerEmail);
  return { success: true };
}

// ============================================================================
// 4. PAYMENT REMINDER EMAIL
// ============================================================================
export async function sendPaymentReminder(data: PaymentEmailData) {
  // Queue email for tracking
  await queueEmail(
    data.bookingId,
    'payment_reminder',
    data.customerEmail,
    data.customerName,
    `Payment Reminder - ${data.serviceName}`,
    '',
  );

  // Note: This should be sent via Edge Function in production
  console.log('Payment reminder email queued for:', data.customerEmail);
  return { success: true };
}

// ============================================================================
// 5. BOOKING REMINDER EMAIL
// ============================================================================
export async function sendBookingReminder(data: BookingEmailData) {
  // Schedule for 1 day before booking
  const bookingDate = new Date(data.bookingDate);
  const reminderDate = new Date(bookingDate);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(10, 0, 0, 0); // Send at 10 AM

  // Queue email for scheduled sending
  await queueEmail(
    data.bookingId,
    'booking_reminder',
    data.customerEmail,
    data.customerName,
    `Reminder: Your ${data.serviceName} Appointment Tomorrow`,
    '',
    reminderDate
  );

  // Note: Scheduled emails should be processed by Edge Function cron job
  console.log('Booking reminder scheduled for:', reminderDate.toISOString(), data.customerEmail);
  return { success: true };
}

// ============================================================================
// 6. BOOKING RESCHEDULED EMAIL
// ============================================================================
export async function sendBookingRescheduled(data: BookingEmailData & { oldDate: string; oldTime: string }) {
  // Queue email for tracking
  await queueEmail(
    data.bookingId,
    'booking_rescheduled',
    data.customerEmail,
    data.customerName,
    `Booking Rescheduled - ${data.serviceName}`,
    '',
  );

  // Note: This should be sent via Edge Function in production
  console.log('Booking rescheduled email queued for:', data.customerEmail);
  return { success: true };
}
