import { Resend } from 'resend';
import { format } from 'date-fns';
import { supabase } from './supabase';

const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

// Email configuration
const EMAIL_CONFIG = {
  from: import.meta.env.VITE_EMAIL_FROM || 'Tinedy CRM <bookings@resend.dev>',
  replyTo: import.meta.env.VITE_EMAIL_REPLY_TO || '',
  autoVerifyPayment: import.meta.env.VITE_AUTO_VERIFY_PAYMENT === 'true' || true, // Auto-verify by default
};

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

// Send email via Resend
async function sendEmail(to: string, subject: string, html: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to,
      subject,
      html,
      ...(EMAIL_CONFIG.replyTo && { replyTo: EMAIL_CONFIG.replyTo }),
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(error.message);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// 1. BOOKING CONFIRMATION EMAIL
// ============================================================================
export async function sendBookingConfirmation(data: PaymentEmailData) {
  const subject = `Booking Confirmed - ${data.serviceName}`;
  const html = generateBookingConfirmationEmail(data);

  // Queue email
  await queueEmail(
    data.bookingId,
    'booking_confirmation',
    data.customerEmail,
    data.customerName,
    subject,
    html
  );

  // Send immediately
  return sendEmail(data.customerEmail, subject, html);
}

function generateBookingConfirmationEmail(data: PaymentEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
  ${getEmailStyles()}
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Booking Confirmed!</h1>
    </div>

    <div class="greeting">
      Hi ${data.customerName},
    </div>

    <p>Thank you for booking with Tinedy! Your appointment has been confirmed.</p>

    <div class="booking-details">
      <div class="detail-row">
        <div class="detail-label">Service:</div>
        <div class="detail-value">${data.serviceName}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Date:</div>
        <div class="detail-value">${format(new Date(data.bookingDate), 'EEEE, MMMM d, yyyy')}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Time:</div>
        <div class="detail-value">${data.startTime} - ${data.endTime}</div>
      </div>
      ${data.staffName ? `
      <div class="detail-row">
        <div class="detail-label">Staff:</div>
        <div class="detail-value">${data.staffName}</div>
      </div>
      ` : ''}
      ${data.location ? `
      <div class="detail-row">
        <div class="detail-label">Location:</div>
        <div class="detail-value">${data.location}</div>
      </div>
      ` : ''}
      <div class="detail-row">
        <div class="detail-label">Total Price:</div>
        <div class="detail-value"><strong>฿${data.totalPrice.toLocaleString()}</strong></div>
      </div>
    </div>

    <div class="payment-section">
      <h3>💳 Complete Your Payment</h3>
      <p>Please complete your payment to secure your booking:</p>
      <a href="${data.paymentLink}" class="button">Pay Now</a>
      <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">
        Or copy this link: <br>
        <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${data.paymentLink}</code>
      </p>
    </div>

    ${data.notes ? `
    <div class="notes-section">
      <strong>Notes:</strong>
      <p>${data.notes}</p>
    </div>
    ` : ''}

    <div class="footer">
      <strong>Tinedy CRM</strong>
      <div class="footer-note">
        If you have any questions, please contact us.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// 2. PAYMENT LINK EMAIL
// ============================================================================
export async function sendPaymentLink(data: PaymentEmailData) {
  const subject = `Payment Required - ${data.serviceName}`;
  const html = generatePaymentLinkEmail(data);

  await queueEmail(
    data.bookingId,
    'payment_link',
    data.customerEmail,
    data.customerName,
    subject,
    html
  );

  return sendEmail(data.customerEmail, subject, html);
}

function generatePaymentLinkEmail(data: PaymentEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Link</title>
  ${getEmailStyles()}
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💳 Payment Link</h1>
    </div>

    <div class="greeting">
      Hi ${data.customerName},
    </div>

    <p>Here's your payment link for your booking:</p>

    <div class="booking-details">
      <div class="detail-row">
        <div class="detail-label">Service:</div>
        <div class="detail-value">${data.serviceName}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Date:</div>
        <div class="detail-value">${format(new Date(data.bookingDate), 'EEEE, MMMM d, yyyy')}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Time:</div>
        <div class="detail-value">${data.startTime} - ${data.endTime}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Amount:</div>
        <div class="detail-value"><strong>฿${data.totalPrice.toLocaleString()}</strong></div>
      </div>
    </div>

    <div class="payment-section">
      <h3>Complete Your Payment</h3>
      <p>Click the button below to pay now:</p>
      <a href="${data.paymentLink}" class="button">Pay ฿${data.totalPrice.toLocaleString()}</a>
      <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">
        Or copy this link: <br>
        <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${data.paymentLink}</code>
      </p>
    </div>

    <div class="footer">
      <strong>Tinedy CRM</strong>
      <div class="footer-note">
        This is an automated email. Please do not reply to this message.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// 3. PAYMENT CONFIRMATION EMAIL
// ============================================================================
export async function sendPaymentConfirmation(data: BookingEmailData) {
  const subject = `Payment Confirmed - ${data.serviceName}`;
  const html = generatePaymentConfirmationEmail(data);

  await queueEmail(
    data.bookingId,
    'payment_confirmation',
    data.customerEmail,
    data.customerName,
    subject,
    html
  );

  return sendEmail(data.customerEmail, subject, html);
}

function generatePaymentConfirmationEmail(data: BookingEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmed</title>
  ${getEmailStyles()}
</head>
<body>
  <div class="container">
    <div class="header success-header">
      <h1>✅ Payment Confirmed!</h1>
    </div>

    <div class="greeting">
      Hi ${data.customerName},
    </div>

    <p>We've received your payment. Your booking is now fully confirmed!</p>

    <div class="booking-details">
      <div class="detail-row">
        <div class="detail-label">Service:</div>
        <div class="detail-value">${data.serviceName}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Date:</div>
        <div class="detail-value">${format(new Date(data.bookingDate), 'EEEE, MMMM d, yyyy')}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Time:</div>
        <div class="detail-value">${data.startTime} - ${data.endTime}</div>
      </div>
      ${data.staffName ? `
      <div class="detail-row">
        <div class="detail-label">Staff:</div>
        <div class="detail-value">${data.staffName}</div>
      </div>
      ` : ''}
      ${data.location ? `
      <div class="detail-row">
        <div class="detail-label">Location:</div>
        <div class="detail-value">${data.location}</div>
      </div>
      ` : ''}
      <div class="detail-row">
        <div class="detail-label">Amount Paid:</div>
        <div class="detail-value"><strong style="color: #10b981;">฿${data.totalPrice.toLocaleString()}</strong></div>
      </div>
    </div>

    <div class="success-message">
      <p><strong>You're all set!</strong></p>
      <p>We'll send you a reminder before your appointment.</p>
    </div>

    <div class="footer">
      <strong>Tinedy CRM</strong>
      <div class="footer-note">
        Looking forward to seeing you!
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// 4. PAYMENT REMINDER EMAIL
// ============================================================================
export async function sendPaymentReminder(data: PaymentEmailData) {
  const subject = `Payment Reminder - ${data.serviceName}`;
  const html = generatePaymentReminderEmail(data);

  await queueEmail(
    data.bookingId,
    'payment_reminder',
    data.customerEmail,
    data.customerName,
    subject,
    html
  );

  return sendEmail(data.customerEmail, subject, html);
}

function generatePaymentReminderEmail(data: PaymentEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder</title>
  ${getEmailStyles()}
</head>
<body>
  <div class="container">
    <div class="header warning-header">
      <h1>⏰ Payment Reminder</h1>
    </div>

    <div class="greeting">
      Hi ${data.customerName},
    </div>

    <p>This is a friendly reminder that your booking payment is still pending.</p>

    <div class="booking-details">
      <div class="detail-row">
        <div class="detail-label">Service:</div>
        <div class="detail-value">${data.serviceName}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Date:</div>
        <div class="detail-value">${format(new Date(data.bookingDate), 'EEEE, MMMM d, yyyy')}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Time:</div>
        <div class="detail-value">${data.startTime} - ${data.endTime}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Amount Due:</div>
        <div class="detail-value"><strong style="color: #f59e0b;">฿${data.totalPrice.toLocaleString()}</strong></div>
      </div>
    </div>

    <div class="payment-section">
      <h3>Complete Your Payment</h3>
      <p>Please complete your payment to confirm your booking:</p>
      <a href="${data.paymentLink}" class="button button-warning">Pay Now</a>
      <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">
        Or copy this link: <br>
        <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${data.paymentLink}</code>
      </p>
    </div>

    <div class="footer">
      <strong>Tinedy CRM</strong>
      <div class="footer-note">
        If you've already paid, please disregard this message.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// 5. BOOKING REMINDER EMAIL
// ============================================================================
export async function sendBookingReminder(data: BookingEmailData) {
  const subject = `Reminder: Your ${data.serviceName} Appointment Tomorrow`;
  const html = generateBookingReminderEmail(data);

  // Schedule for 1 day before booking
  const bookingDate = new Date(data.bookingDate);
  const reminderDate = new Date(bookingDate);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(10, 0, 0, 0); // Send at 10 AM

  await queueEmail(
    data.bookingId,
    'booking_reminder',
    data.customerEmail,
    data.customerName,
    subject,
    html,
    reminderDate
  );

  return sendEmail(data.customerEmail, subject, html);
}

function generateBookingReminderEmail(data: BookingEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Reminder</title>
  ${getEmailStyles()}
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Booking Reminder</h1>
    </div>

    <div class="greeting">
      Hi ${data.customerName},
    </div>

    <p>This is a friendly reminder about your upcoming appointment with Tinedy.</p>

    <div class="booking-details">
      <div class="detail-row">
        <div class="detail-label">Service:</div>
        <div class="detail-value">${data.serviceName}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Date:</div>
        <div class="detail-value">${format(new Date(data.bookingDate), 'EEEE, MMMM d, yyyy')}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Time:</div>
        <div class="detail-value">${data.startTime} - ${data.endTime}</div>
      </div>
      ${data.staffName ? `
      <div class="detail-row">
        <div class="detail-label">Staff:</div>
        <div class="detail-value">${data.staffName}</div>
      </div>
      ` : ''}
      ${data.location ? `
      <div class="detail-row">
        <div class="detail-label">Location:</div>
        <div class="detail-value">${data.location}</div>
      </div>
      ` : ''}
    </div>

    ${data.notes ? `
    <div class="notes-section">
      <strong>Notes:</strong>
      <p>${data.notes}</p>
    </div>
    ` : ''}

    <p>We're looking forward to seeing you!</p>
    <p>If you need to reschedule or have any questions, please don't hesitate to contact us.</p>

    <div class="footer">
      <strong>Tinedy CRM</strong>
      <div class="footer-note">
        This is an automated reminder email.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// 6. BOOKING RESCHEDULED EMAIL
// ============================================================================
export async function sendBookingRescheduled(data: BookingEmailData & { oldDate: string; oldTime: string }) {
  const subject = `Booking Rescheduled - ${data.serviceName}`;
  const html = generateBookingRescheduledEmail(data);

  await queueEmail(
    data.bookingId,
    'booking_rescheduled',
    data.customerEmail,
    data.customerName,
    subject,
    html
  );

  return sendEmail(data.customerEmail, subject, html);
}

function generateBookingRescheduledEmail(data: BookingEmailData & { oldDate: string; oldTime: string }): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Rescheduled</title>
  ${getEmailStyles()}
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Booking Rescheduled</h1>
    </div>

    <div class="greeting">
      Hi ${data.customerName},
    </div>

    <p>Your booking has been rescheduled to a new date and time.</p>

    <div class="booking-details" style="background-color: #fef3c7; border-left-color: #f59e0b;">
      <h3 style="margin-top: 0; color: #92400e;">Previous Schedule</h3>
      <div class="detail-row">
        <div class="detail-label">Date:</div>
        <div class="detail-value" style="text-decoration: line-through;">${format(new Date(data.oldDate), 'EEEE, MMMM d, yyyy')}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Time:</div>
        <div class="detail-value" style="text-decoration: line-through;">${data.oldTime}</div>
      </div>
    </div>

    <div class="booking-details" style="background-color: #d1fae5; border-left-color: #10b981;">
      <h3 style="margin-top: 0; color: #065f46;">New Schedule</h3>
      <div class="detail-row">
        <div class="detail-label">Service:</div>
        <div class="detail-value">${data.serviceName}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Date:</div>
        <div class="detail-value"><strong>${format(new Date(data.bookingDate), 'EEEE, MMMM d, yyyy')}</strong></div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Time:</div>
        <div class="detail-value"><strong>${data.startTime} - ${data.endTime}</strong></div>
      </div>
      ${data.staffName ? `
      <div class="detail-row">
        <div class="detail-label">Staff:</div>
        <div class="detail-value">${data.staffName}</div>
      </div>
      ` : ''}
      ${data.location ? `
      <div class="detail-row">
        <div class="detail-label">Location:</div>
        <div class="detail-value">${data.location}</div>
      </div>
      ` : ''}
    </div>

    <p>If you have any questions about this change, please contact us.</p>

    <div class="footer">
      <strong>Tinedy CRM</strong>
      <div class="footer-note">
        Thank you for your understanding.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// SHARED EMAIL STYLES
// ============================================================================
function getEmailStyles(): string {
  return `
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #4F46E5;
    }
    .header h1 {
      color: #4F46E5;
      margin: 0;
      font-size: 28px;
    }
    .success-header {
      border-bottom-color: #10b981;
    }
    .success-header h1 {
      color: #10b981;
    }
    .warning-header {
      border-bottom-color: #f59e0b;
    }
    .warning-header h1 {
      color: #f59e0b;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
    }
    .booking-details {
      background-color: #f8f9fa;
      border-left: 4px solid #4F46E5;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .detail-row {
      display: flex;
      margin: 12px 0;
    }
    .detail-label {
      font-weight: 600;
      color: #4F46E5;
      min-width: 120px;
    }
    .detail-value {
      color: #333;
    }
    .payment-section {
      background-color: #eff6ff;
      border: 2px solid #3b82f6;
      border-radius: 8px;
      padding: 24px;
      margin: 24px 0;
      text-align: center;
    }
    .payment-section h3 {
      margin-top: 0;
      color: #1e40af;
    }
    .button {
      display: inline-block;
      background-color: #4F46E5;
      color: #ffffff;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 16px 0;
      transition: background-color 0.2s;
    }
    .button:hover {
      background-color: #4338ca;
    }
    .button-warning {
      background-color: #f59e0b;
    }
    .button-warning:hover {
      background-color: #d97706;
    }
    .success-message {
      background-color: #d1fae5;
      border-left: 4px solid #10b981;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .notes-section {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
    }
    .footer-note {
      margin-top: 20px;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
  `;
}
