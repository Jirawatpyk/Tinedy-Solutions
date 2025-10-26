import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get request body
    const {
      customerName,
      customerEmail,
      serviceName,
      bookingDate,
      startTime,
      endTime,
      location,
      notes
    } = await req.json()

    if (!customerName || !customerEmail || !serviceName || !bookingDate || !startTime || !endTime) {
      throw new Error('Missing required fields')
    }

    // Fetch business settings from database
    let fromName = 'Tinedy CRM'
    let fromEmail = 'bookings@resend.dev'
    let businessPhone = ''
    let businessAddress = ''

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
          .select('business_name, business_email, business_phone, business_address')
          .limit(1)
          .maybeSingle()

        if (settings) {
          fromName = settings.business_name || fromName
          fromEmail = settings.business_email || fromEmail
          businessPhone = settings.business_phone || businessPhone
          businessAddress = settings.business_address || businessAddress
        }
      }
    } catch (error) {
      console.warn('Failed to fetch settings, using defaults:', error)
      // Continue with default values
    }

    // Format date
    const date = new Date(bookingDate)
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Generate HTML email
    const htmlContent = `
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
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Booking Reminder</h1>
    </div>

    <div class="greeting">
      Hi ${customerName},
    </div>

    <p>This is a friendly reminder about your upcoming appointment with ${fromName}.</p>

    <div class="booking-details">
      <div class="detail-row">
        <div class="detail-label">Service:</div>
        <div class="detail-value">${serviceName}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Date:</div>
        <div class="detail-value">${formattedDate}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Time:</div>
        <div class="detail-value">${startTime} - ${endTime}</div>
      </div>
      ${location ? `
      <div class="detail-row">
        <div class="detail-label">Location:</div>
        <div class="detail-value">${location}</div>
      </div>
      ` : ''}
      ${notes ? `
      <div class="detail-row">
        <div class="detail-label">Notes:</div>
        <div class="detail-value">${notes}</div>
      </div>
      ` : ''}
    </div>

    <p>We're looking forward to seeing you!</p>

    <p>If you need to reschedule or have any questions, please don't hesitate to contact us.</p>

    <div class="footer">
      <div class="business-info">
        <div class="business-name">${fromName}</div>
        ${businessPhone ? `
        <div class="contact-item">
          <span>📞</span>
          <span>${businessPhone}</span>
        </div>
        ` : ''}
        ${businessAddress ? `
        <div class="contact-item">
          <span>📍</span>
          <span>${businessAddress}</span>
        </div>
        ` : ''}
      </div>
      <div class="footer-note">
        This is an automated reminder email. Please do not reply to this message.
      </div>
    </div>
  </div>
</body>
</html>
    `.trim()

    // Send email using Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: customerEmail,
        subject: `Reminder: Your ${serviceName} Appointment`,
        html: htmlContent,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
