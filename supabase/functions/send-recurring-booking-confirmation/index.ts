import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RecurringBookingEmailData {
  groupId: string
  bookingIds: string[]
  customerName: string
  customerEmail: string
  serviceName: string
  bookingDates: { date: string; sequence: number }[]  // Array of dates with sequence
  startTime: string
  endTime: string
  totalPrice: number      // ราคารวมทั้งหมด
  pricePerBooking: number // ราคาต่อครั้ง
  location: string
  paymentLink: string     // Link ไปที่ parent booking
  staffName?: string
  notes?: string
  frequency: number       // จำนวนครั้งทั้งหมด
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set')
    }

    const data: RecurringBookingEmailData = await req.json()

    // Validate required fields
    if (!data.customerEmail || !data.customerName || !data.serviceName || !data.bookingDates.length) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Fetch business settings from database
    let fromName = 'Tinedy CRM'
    let fromEmail = 'bookings@resend.dev'
    let businessPhone = ''
    let businessAddress = ''
    let businessLogoUrl = 'https://homtefwwsrrwfzmxdnrk.supabase.co/storage/v1/object/public/logo/logo-horizontal.png'

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })

        const { data: settings } = await supabase
          .from('settings')
          .select('business_name, business_email, business_phone, business_address, business_logo_url')
          .limit(1)
          .maybeSingle()

        if (settings) {
          fromName = settings.business_name || fromName
          fromEmail = settings.business_email || fromEmail
          businessPhone = settings.business_phone || businessPhone
          businessAddress = settings.business_address || businessAddress
          businessLogoUrl = settings.business_logo_url || businessLogoUrl
        }
      }
    } catch (error) {
      console.warn('Failed to fetch settings, using defaults:', error)
    }

    // Generate email HTML
    const emailHtml = generateRecurringBookingConfirmationEmail({
      ...data,
      fromName,
      businessPhone,
      businessAddress,
      businessLogoUrl,
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
        to: data.customerEmail,
        subject: `Recurring Booking Confirmed - ${data.serviceName} (${data.frequency} times)`,
        html: emailHtml,
      }),
    })

    const responseData = await response.json()

    if (!response.ok) {
      throw new Error(responseData.message || 'Failed to send email')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Recurring booking confirmation email sent successfully',
        data: responseData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

function generateRecurringBookingConfirmationEmail(data: RecurringBookingEmailData & {
  fromName: string
  businessPhone: string
  businessAddress: string
  businessLogoUrl: string
}): string {
  // Sort dates
  const sortedDates = [...data.bookingDates].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Generate schedule list HTML
  const scheduleListHtml = sortedDates.map((item, index) => {
    const dateFormatted = new Date(item.date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })

    return `
      <div class="schedule-item">
        <div class="schedule-number">${index + 1}/${data.frequency}</div>
        <div class="schedule-details">
          <div class="schedule-date">📅 ${dateFormatted}</div>
          <div class="schedule-time">🕐 ${data.startTime} - ${data.endTime}</div>
        </div>
      </div>
    `
  }).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recurring Booking Confirmation</title>
  ${getEmailStyles()}
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${data.businessLogoUrl}"
           alt="${data.fromName} Logo"
           class="logo"
           style="max-height: 100px; max-width: 200px; margin-bottom: 16px; object-fit: contain;" />
      <h1>✅ Recurring Booking Confirmed!</h1>
      <p class="header-subtitle">${data.frequency} sessions scheduled</p>
    </div>

    <div class="greeting">
      Hi ${data.customerName},
    </div>

    <p>Thank you for booking with ${data.fromName}! Your recurring appointments have been confirmed.</p>

    <div class="booking-details">
      <div class="detail-row">
        <div class="detail-label">Service:</div>
        <div class="detail-value">${data.serviceName}</div>
      </div>
      ${data.staffName ? `
      <div class="detail-row">
        <div class="detail-label">Staff:</div>
        <div class="detail-value">${data.staffName}</div>
      </div>
      ` : ''}
      <div class="detail-row">
        <div class="detail-label">Location:</div>
        <div class="detail-value">${data.location}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Time:</div>
        <div class="detail-value">${data.startTime} - ${data.endTime}</div>
      </div>
    </div>

    <div class="schedule-section">
      <h3>📅 Your Schedule (${data.frequency} sessions)</h3>
      <div class="schedule-list">
        ${scheduleListHtml}
      </div>
    </div>

    ${data.notes ? `
    <div class="notes-section">
      <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #92400e;">📝 Additional Notes</h3>
      <p style="margin: 0; color: #78350f;">${data.notes}</p>
    </div>
    ` : ''}

    <div class="total-section">
      <div class="total-row">
        <div>Price per session:</div>
        <div>฿${data.pricePerBooking.toLocaleString()}</div>
      </div>
      <div class="total-row">
        <div>Number of sessions:</div>
        <div>× ${data.frequency}</div>
      </div>
      <div class="total-divider"></div>
      <div class="total-row total-amount">
        <div>Total Amount:</div>
        <div>฿${data.totalPrice.toLocaleString()}</div>
      </div>
    </div>

    <div class="payment-section">
      <h3>💳 Complete Your Payment</h3>
      <p>Please complete your payment to secure all your bookings:</p>
      <a href="${data.paymentLink}" class="button">Pay ฿${data.totalPrice.toLocaleString()} Now</a>
      <p class="payment-note">
        Pay once for all ${data.frequency} sessions
      </p>
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
        If you have any questions, please contact us.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

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
    .logo-placeholder {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .header h1 {
      color: #4F46E5;
      margin: 0;
      font-size: 28px;
    }
    .header-subtitle {
      color: #6b7280;
      font-size: 14px;
      margin-top: 5px;
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
    .schedule-section {
      margin: 30px 0;
    }
    .schedule-section h3 {
      color: #1f2937;
      margin-bottom: 16px;
    }
    .schedule-list {
      background-color: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      border: 1px solid #e5e7eb;
    }
    .schedule-item {
      display: flex;
      align-items: center;
      padding: 12px;
      margin: 8px 0;
      background-color: #ffffff;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    .schedule-number {
      background-color: #4F46E5;
      color: white;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 14px;
      min-width: 50px;
      text-align: center;
    }
    .schedule-details {
      flex: 1;
      margin-left: 16px;
    }
    .schedule-date {
      font-weight: 600;
      color: #1f2937;
      font-size: 15px;
    }
    .schedule-time {
      color: #6b7280;
      font-size: 14px;
      margin-top: 2px;
    }
    .schedule-price {
      font-weight: 600;
      color: #059669;
      font-size: 16px;
    }
    .location-section {
      display: flex;
      align-items: start;
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .location-icon {
      font-size: 24px;
      margin-right: 12px;
    }
    .location-text {
      flex: 1;
      font-size: 14px;
      line-height: 1.5;
    }
    .total-section {
      background-color: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
      font-size: 15px;
    }
    .total-divider {
      border-top: 2px solid #d1d5db;
      margin: 12px 0;
    }
    .total-amount {
      font-size: 20px;
      font-weight: 700;
      color: #059669;
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
    .payment-note {
      font-size: 14px;
      color: #4b5563;
      margin-top: 8px;
      font-weight: 600;
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
      text-align: left;
    }
    .business-name {
      font-size: 18px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 12px;
      text-align: center;
    }
    .contact-item {
      display: flex;
      align-items: flex-start;
      justify-content: flex-start;
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
