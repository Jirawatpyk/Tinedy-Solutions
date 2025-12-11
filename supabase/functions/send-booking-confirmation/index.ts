import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BookingEmailData {
  bookingId: string
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
  paymentLink: string
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

    const data: BookingEmailData = await req.json()

    // Validate required fields
    if (!data.customerEmail || !data.customerName || !data.serviceName) {
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
      // Continue with default values
    }

    // Format date for email
    const bookingDateFormatted = new Date(data.bookingDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Generate email HTML
    const emailHtml = generateBookingConfirmationEmail({
      ...data,
      bookingDateFormatted,
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
        subject: `Booking Confirmed - ${data.serviceName}`,
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
        message: 'Email sent successfully',
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

function generateBookingConfirmationEmail(data: BookingEmailData & {
  bookingDateFormatted: string
  fromName: string
  businessPhone: string
  businessAddress: string
  businessLogoUrl: string
}): string {
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
      <img src="${data.businessLogoUrl}"
           alt="${data.fromName} Logo"
           class="logo"
           style="max-height: 100px; max-width: 200px; margin-bottom: 16px; object-fit: contain;" />
      <h1>✅ Booking Confirmed!</h1>
    </div>

    <div class="greeting">
      Hi ${data.customerName},
    </div>

    <p>Thank you for booking with ${data.fromName}! Your appointment has been confirmed.</p>

    <div class="booking-details">
      <div class="detail-row">
        <div class="detail-label">Service:</div>
        <div class="detail-value">${data.serviceName}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Date:</div>
        <div class="detail-value">${data.bookingDateFormatted}</div>
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

/**
 * Email Styles
 * Color Palette:
 * - Primary: #4F46E5 (Indigo-600) - Headers, buttons, accents
 * - Primary Hover: #4338ca (Indigo-700)
 * - Success: #10b981 (Green-500)
 * - Warning: #f59e0b (Yellow-500) - Notes section
 * - Text: #333, #1f2937, #4b5563, #6b7280, #9ca3af
 * - Background: #f5f5f5, #ffffff, #f8f9fa, #f9fafb
 * - Border: #e5e7eb
 *
 * Business Info Section:
 * - business-name: text-align: center (centered business name)
 * - contact-item: justify-content: flex-start (left-aligned phone/address)
 */
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
