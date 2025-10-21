import { Resend } from 'resend';
import { format } from 'date-fns';

const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

export interface BookingReminderData {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  location?: string;
  notes?: string;
}

export async function sendBookingReminder(data: BookingReminderData) {
  try {
    const { data: emailData, error } = await resend.emails.send({
      from: 'Tinedy CRM <bookings@resend.dev>', // Note: In production, use your verified domain
      to: data.customerEmail,
      subject: `Reminder: Your ${data.serviceName} Appointment`,
      html: generateBookingReminderEmail(data),
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(error.message);
    }

    return { success: true, data: emailData };
  } catch (error) {
    console.error('Failed to send email reminder:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function generateBookingReminderEmail(data: BookingReminderData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Reminder</title>
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
      ${data.location ? `
      <div class="detail-row">
        <div class="detail-label">Location:</div>
        <div class="detail-value">${data.location}</div>
      </div>
      ` : ''}
      ${data.notes ? `
      <div class="detail-row">
        <div class="detail-label">Notes:</div>
        <div class="detail-value">${data.notes}</div>
      </div>
      ` : ''}
    </div>

    <p>We're looking forward to seeing you!</p>

    <p>If you need to reschedule or have any questions, please don't hesitate to contact us.</p>

    <div class="footer">
      <strong>Tinedy CRM</strong>
      <div class="footer-note">
        This is an automated reminder email. Please do not reply to this message.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
