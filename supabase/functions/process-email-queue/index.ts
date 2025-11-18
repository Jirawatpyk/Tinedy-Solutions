import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailQueue {
  id: string
  booking_id: string
  email_type: string
  recipient_email: string
  recipient_name: string
  status: string
  subject: string
  html_content: string
  attempts: number
  max_attempts: number
  scheduled_at: string | null
  error_message: string | null
}

interface BookingData {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  total_price: number
  address: string | null
  notes: string | null
  customers: {
    full_name: string
    email: string
  }
  service_packages: {
    name: string
  }
  profiles: {
    full_name: string
  } | null
}

interface EmailTemplateData {
  customerName: string
  customerEmail: string
  serviceName: string
  bookingDate: string
  startTime: string
  endTime: string
  totalPrice: number
  location?: string
  notes?: string
  staffName?: string
  paymentLink?: string
  bookingId: string
  fromName: string
  businessPhone: string
  businessAddress: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set')
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Fetch business settings from database
    let fromName = 'Tinedy CRM'
    let fromEmail = 'bookings@resend.dev'
    let businessPhone = ''
    let businessAddress = ''

    try {
      const { data: settings } = await supabase
        .from('settings')
        .select('business_name, business_email, business_phone, business_address')
        .limit(1)
        .maybeSingle()

      if (settings) {
        fromName = settings.business_name || fromName
        fromEmail = settings.business_email || fromEmail
        businessPhone = settings.business_phone || businessPhone
        businessAddress = settings.business_address || businessAddress
      }
    } catch (error) {
      console.warn('Failed to fetch settings, using defaults:', error)
      // Continue with default values
    }

    // Get pending emails that are ready to send
    const now = new Date().toISOString()
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3) // Max 3 attempts
      .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
      .order('created_at', { ascending: true })
      .limit(10) // Process 10 emails at a time

    if (fetchError) {
      console.error('Error fetching emails:', fetchError)
      throw fetchError
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending emails to process',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`Processing ${pendingEmails.length} emails`)

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process each email
    for (const email of pendingEmails as EmailQueue[]) {
      results.processed++

      try {
        // Fetch booking data if needed (for generating email content)
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            *,
            customers (full_name, email),
            service_packages (name),
            profiles!bookings_staff_id_fkey (full_name)
          `)
          .eq('id', email.booking_id)
          .single()

        if (bookingError) {
          throw new Error(`Failed to fetch booking: ${bookingError.message}`)
        }

        const bookingData = booking as unknown as BookingData

        // Generate email HTML based on email type
        const emailHtml = generateEmailHtml(email.email_type, {
          customerName: email.recipient_name,
          customerEmail: email.recipient_email,
          serviceName: bookingData.service_packages.name,
          bookingDate: bookingData.booking_date,
          startTime: bookingData.start_time,
          endTime: bookingData.end_time,
          totalPrice: bookingData.total_price,
          location: bookingData.address || undefined,
          notes: bookingData.notes || undefined,
          staffName: bookingData.profiles?.full_name || undefined,
          paymentLink: `${Deno.env.get('APP_URL') || 'http://localhost:5173'}/payment/${bookingData.id}`,
          bookingId: bookingData.id,
          fromName,
          businessPhone,
          businessAddress,
        })

        // Send email using Resend API
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: email.recipient_email,
            subject: email.subject,
            html: emailHtml,
          }),
        })

        const responseData = await response.json()

        if (!response.ok) {
          throw new Error(responseData.message || 'Failed to send email')
        }

        // Update email status to sent
        await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            attempts: email.attempts + 1,
          })
          .eq('id', email.id)

        results.sent++
        console.log(`✓ Sent ${email.email_type} to ${email.recipient_email}`)

      } catch (error) {
        // Update email status to failed and increment attempts
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        await supabase
          .from('email_queue')
          .update({
            status: email.attempts + 1 >= email.max_attempts ? 'failed' : 'pending',
            error_message: errorMessage,
            attempts: email.attempts + 1,
          })
          .eq('id', email.id)

        results.failed++
        results.errors.push(`${email.email_type} to ${email.recipient_email}: ${errorMessage}`)
        console.error(`✗ Failed to send ${email.email_type} to ${email.recipient_email}:`, errorMessage)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Processed ${results.processed} emails: ${results.sent} sent, ${results.failed} failed`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================================================
// Email Template Generator
// ============================================================================
function generateEmailHtml(emailType: string, data: EmailTemplateData): string {
  switch (emailType) {
    case 'payment_link':
      return generatePaymentLinkEmail(data)
    case 'payment_confirmation':
      return generatePaymentConfirmationEmail(data)
    case 'payment_reminder':
      return generatePaymentReminderEmail(data)
    case 'booking_reminder':
      return generateBookingReminderEmail(data)
    case 'booking_rescheduled':
      return generateBookingRescheduledEmail(data)
    default:
      throw new Error(`Unknown email type: ${emailType}`)
  }
}

// Payment Link Email Template
function generatePaymentLinkEmail(data: EmailTemplateData): string {
  const bookingDateFormatted = new Date(data.bookingDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

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
        <div class="detail-value">${bookingDateFormatted}</div>
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
      <div class="business-info">
        <div class="business-name">${data.fromName}</div>
        ${data.businessPhone ? `
        <div class="contact-item">
          <span>📞</span>
          <span>${data.businessPhone}</span>
        </div>
        ` : ''}
        ${data.businessAddress ? `
        <div class="contact-item">
          <span>📍</span>
          <span>${data.businessAddress}</span>
        </div>
        ` : ''}
      </div>
      <div class="footer-note">
        This is an automated email.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

// Payment Confirmation Email Template
function generatePaymentConfirmationEmail(data: EmailTemplateData): string {
  const bookingDateFormatted = new Date(data.bookingDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

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
        <div class="detail-value">${bookingDateFormatted}</div>
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
      <div class="business-info">
        <div class="business-name">${data.fromName}</div>
        ${data.businessPhone ? `
        <div class="contact-item">
          <span>📞</span>
          <span>${data.businessPhone}</span>
        </div>
        ` : ''}
        ${data.businessAddress ? `
        <div class="contact-item">
          <span>📍</span>
          <span>${data.businessAddress}</span>
        </div>
        ` : ''}
      </div>
      <div class="footer-note">
        Looking forward to seeing you!
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

// Payment Reminder Email Template
function generatePaymentReminderEmail(data: EmailTemplateData): string {
  const bookingDateFormatted = new Date(data.bookingDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

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
        <div class="detail-value">${bookingDateFormatted}</div>
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
      <div class="business-info">
        <div class="business-name">${data.fromName}</div>
        ${data.businessPhone ? `
        <div class="contact-item">
          <span>📞</span>
          <span>${data.businessPhone}</span>
        </div>
        ` : ''}
        ${data.businessAddress ? `
        <div class="contact-item">
          <span>📍</span>
          <span>${data.businessAddress}</span>
        </div>
        ` : ''}
      </div>
      <div class="footer-note">
        If you've already paid, please disregard this message.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

// Booking Reminder Email Template
function generateBookingReminderEmail(data: EmailTemplateData): string {
  const bookingDateFormatted = new Date(data.bookingDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

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

    <p>This is a friendly reminder about your upcoming appointment with ${data.fromName}.</p>

    <div class="booking-details">
      <div class="detail-row">
        <div class="detail-label">Service:</div>
        <div class="detail-value">${data.serviceName}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Date:</div>
        <div class="detail-value">${bookingDateFormatted}</div>
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
      <div class="business-info">
        <div class="business-name">${data.fromName}</div>
        ${data.businessPhone ? `
        <div class="contact-item">
          <span>📞</span>
          <span>${data.businessPhone}</span>
        </div>
        ` : ''}
        ${data.businessAddress ? `
        <div class="contact-item">
          <span>📍</span>
          <span>${data.businessAddress}</span>
        </div>
        ` : ''}
      </div>
      <div class="footer-note">
        This is an automated reminder email.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

// Booking Rescheduled Email Template
function generateBookingRescheduledEmail(data: EmailTemplateData): string {
  const bookingDateFormatted = new Date(data.bookingDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

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

    <div class="booking-details" style="background-color: #d1fae5; border-left-color: #10b981;">
      <h3 style="margin-top: 0; color: #065f46;">New Schedule</h3>
      <div class="detail-row">
        <div class="detail-label">Service:</div>
        <div class="detail-value">${data.serviceName}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Date:</div>
        <div class="detail-value"><strong>${bookingDateFormatted}</strong></div>
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
      <div class="business-info">
        <div class="business-name">${data.fromName}</div>
        ${data.businessPhone ? `
        <div class="contact-item">
          <span>📞</span>
          <span>${data.businessPhone}</span>
        </div>
        ` : ''}
        ${data.businessAddress ? `
        <div class="contact-item">
          <span>📍</span>
          <span>${data.businessAddress}</span>
        </div>
        ` : ''}
      </div>
      <div class="footer-note">
        Thank you for your understanding.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

// Shared Email Styles
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
      color: #ffffff !important;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 16px 0;
      transition: background-color 0.2s;
      font-size: 16px;
    }
    .button:hover {
      background-color: #4338ca;
      color: #ffffff !important;
    }
    .button:visited {
      color: #ffffff !important;
    }
    .button:active {
      color: #ffffff !important;
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
    .business-info {
      background-color: #f9fafb;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
      border: 1px solid #e5e7eb;
    }
    .business-name {
      font-size: 18px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 12px;
    }
    .contact-item {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 8px 0;
      font-size: 14px;
      color: #4b5563;
    }
    .contact-item span {
      margin-left: 8px;
    }
    .footer-note {
      margin-top: 20px;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
  `
}
