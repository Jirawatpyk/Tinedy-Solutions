import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BookingData {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  total_price: number
  customers: {
    full_name: string
    email: string
  }
  service_packages: {
    name: string
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== send-payment-confirmation started ===')

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    console.log('RESEND_API_KEY exists:', !!RESEND_API_KEY)

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set')
      throw new Error('RESEND_API_KEY is not set')
    }

    const { bookingId } = await req.json()
    console.log('Received bookingId:', bookingId)

    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'Missing bookingId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      throw new Error('Supabase configuration is missing')
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Fetch business settings from database
    console.log('Fetching business settings...')
    let fromName = 'Tinedy CRM'
    let fromEmail = 'bookings@resend.dev'
    let businessPhone = ''
    let businessAddress = ''

    try {
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('business_name, business_email, business_phone, business_address')
        .limit(1)
        .maybeSingle()

      if (settingsError) {
        console.warn('Settings fetch error:', settingsError)
      } else {
        console.log('Settings fetched:', !!settings)
      }

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

    // Fetch booking data
    console.log('Fetching booking data...')
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        total_price,
        customers (full_name, email),
        service_packages (name)
      `)
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      console.error('Error fetching booking:', fetchError)
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Booking fetched successfully')
    const bookingData = booking as unknown as BookingData

    // Format date
    const bookingDate = new Date(bookingData.booking_date)
    const formattedDate = bookingDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Generate email HTML (staff info and location not included)
    const emailHtml = generatePaymentConfirmationEmail({
      customerName: bookingData.customers.full_name,
      serviceName: bookingData.service_packages.name,
      formattedDate,
      startTime: bookingData.start_time,
      endTime: bookingData.end_time,
      staffName: undefined,
      location: undefined,
      totalPrice: bookingData.total_price,
      fromName,
      businessPhone,
      businessAddress,
    })

    // Send email via Resend
    console.log('Sending email to:', bookingData.customers.email)
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: bookingData.customers.email,
        subject: `Payment Confirmed - ${bookingData.service_packages.name}`,
        html: emailHtml,
      }),
    })

    console.log('Email API response status:', emailResponse.status)
    const emailResult = await emailResponse.json()

    if (!emailResponse.ok) {
      console.error('Resend error:', emailResult)
      throw new Error(emailResult.message || 'Failed to send email')
    }

    console.log('Payment confirmation email sent successfully:', emailResult.id)

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResult.id,
        message: 'Payment confirmation email sent successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in send-payment-confirmation:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

function generatePaymentConfirmationEmail(data: {
  customerName: string
  serviceName: string
  formattedDate: string
  startTime: string
  endTime: string
  staffName?: string
  location?: string
  totalPrice: number
  fromName: string
  businessPhone: string
  businessAddress: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmed</title>
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
      border-bottom: 2px solid #10b981;
    }
    .header h1 {
      color: #10b981;
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
    .success-message {
      background-color: #d1fae5;
      border-left: 4px solid #10b981;
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
</head>
<body>
  <div class="container">
    <div class="header">
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
        <div class="detail-value">${data.formattedDate}</div>
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
