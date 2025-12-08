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
  amount_paid: number
  recurring_group_id?: string
  customers: {
    full_name: string
    email: string
  }
  service_packages?: {
    name: string
  } | null
  service_packages_v2?: {
    name: string
  } | null
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== send-refund-confirmation started ===')

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
    let businessLogoUrl = 'https://homtefwwsrrwfzmxdnrk.supabase.co/storage/v1/object/public/logo/logo-horizontal.png'

    try {
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('business_name, business_email, business_phone, business_address, business_logo_url')
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
        businessLogoUrl = settings.business_logo_url || businessLogoUrl
      }
    } catch (error) {
      console.warn('Failed to fetch settings, using defaults:', error)
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
        amount_paid,
        recurring_group_id,
        customers (full_name, email),
        service_packages (name),
        service_packages_v2 (name)
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

    // Get service name from either service_packages or service_packages_v2
    const serviceName = bookingData.service_packages?.name || bookingData.service_packages_v2?.name || 'Service'

    // Calculate refund amount
    const refundAmount = bookingData.amount_paid || bookingData.total_price || 0

    let emailHtml: string
    let refundCount = 1

    if (bookingData.recurring_group_id) {
      // Fetch all bookings in the recurring group that were refunded
      const { data: groupBookings, error: groupError } = await supabase
        .from('bookings')
        .select('id, booking_date, start_time, end_time, total_price, amount_paid')
        .eq('recurring_group_id', bookingData.recurring_group_id)
        .eq('payment_status', 'refunded')
        .order('booking_date')

      if (!groupError && groupBookings && groupBookings.length > 1) {
        refundCount = groupBookings.length
        const totalRefund = groupBookings.reduce((sum, b) => sum + Number(b.amount_paid || b.total_price || 0), 0)

        emailHtml = generateRecurringRefundEmail({
          customerName: bookingData.customers.full_name,
          serviceName,
          bookings: groupBookings,
          totalRefund,
          refundCount,
          fromName,
          businessPhone,
          businessAddress,
          businessLogoUrl,
        })
      } else {
        // Single refund in recurring group or fallback
        const bookingDate = new Date(bookingData.booking_date)
        const formattedDate = bookingDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })

        emailHtml = generateSingleRefundEmail({
          customerName: bookingData.customers.full_name,
          serviceName,
          formattedDate,
          startTime: bookingData.start_time,
          endTime: bookingData.end_time,
          refundAmount,
          fromName,
          businessPhone,
          businessAddress,
          businessLogoUrl,
        })
      }
    } else {
      // Single booking refund
      const bookingDate = new Date(bookingData.booking_date)
      const formattedDate = bookingDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      emailHtml = generateSingleRefundEmail({
        customerName: bookingData.customers.full_name,
        serviceName,
        formattedDate,
        startTime: bookingData.start_time,
        endTime: bookingData.end_time,
        refundAmount,
        fromName,
        businessPhone,
        businessAddress,
        businessLogoUrl,
      })
    }

    // Send email via Resend
    console.log('Sending refund confirmation email to:', bookingData.customers.email)
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: bookingData.customers.email,
        subject: `Refund Processed - ${serviceName}`,
        html: emailHtml,
      }),
    })

    console.log('Email API response status:', emailResponse.status)
    const emailResult = await emailResponse.json()

    if (!emailResponse.ok) {
      console.error('Resend error:', emailResult)
      throw new Error(emailResult.message || 'Failed to send email')
    }

    console.log('Refund confirmation email sent successfully:', emailResult.id)

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResult.id,
        message: refundCount > 1
          ? `Refund confirmation email sent for ${refundCount} bookings`
          : 'Refund confirmation email sent successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in send-refund-confirmation:', error)
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

function generateSingleRefundEmail(data: {
  customerName: string
  serviceName: string
  formattedDate: string
  startTime: string
  endTime: string
  refundAmount: number
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
  <title>Refund Processed</title>
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
      border-bottom: 2px solid #6366f1;
    }
    .header h1 {
      color: #6366f1;
      margin: 0;
      font-size: 28px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
    }
    .booking-details {
      background-color: #f8f9fa;
      border-left: 4px solid #6366f1;
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
      color: #6366f1;
      min-width: 120px;
    }
    .detail-value {
      color: #333;
    }
    .refund-amount {
      background-color: #dbeafe;
      border-left: 4px solid #3b82f6;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
      text-align: center;
    }
    .refund-amount .amount {
      font-size: 24px;
      font-weight: 700;
      color: #3b82f6;
    }
    .info-message {
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
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${data.businessLogoUrl}"
           alt="${data.fromName} Logo"
           class="logo"
           style="max-height: 100px; max-width: 200px; margin-bottom: 16px; object-fit: contain;" />
      <h1>💸 Refund Processed</h1>
    </div>

    <div class="greeting">
      Hi ${data.customerName},
    </div>

    <p>We've processed your refund for the following booking:</p>

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
    </div>

    <div class="refund-amount">
      <p style="margin: 0 0 8px 0; color: #6b7280;">Refund Amount</p>
      <div class="amount">฿${data.refundAmount.toLocaleString()}</div>
    </div>

    <div class="info-message">
      <p style="margin: 0;"><strong>📋 Please note:</strong></p>
      <p style="margin: 8px 0 0 0;">The refund will be credited to your original payment method within 5-10 business days, depending on your bank.</p>
    </div>

    <p>If you have any questions about your refund, please don't hesitate to contact us.</p>

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
        We hope to serve you again soon!
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

function generateRecurringRefundEmail(data: {
  customerName: string
  serviceName: string
  bookings: Array<{
    id: string
    booking_date: string
    start_time: string
    end_time: string
    total_price: number
    amount_paid: number
  }>
  totalRefund: number
  refundCount: number
  fromName: string
  businessPhone: string
  businessAddress: string
  businessLogoUrl: string
}): string {
  const scheduleListHtml = data.bookings.map((booking, index) => {
    const bookingDate = new Date(booking.booking_date)
    const formattedDate = bookingDate.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
    const amount = booking.amount_paid || booking.total_price || 0

    return `
      <div style="padding: 12px; background-color: ${index % 2 === 0 ? '#f9fafb' : '#ffffff'}; border-radius: 4px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-weight: 600; color: #6366f1; margin-right: 8px;">#${index + 1}</span>
            <span style="color: #1f2937;">📅 ${formattedDate}</span>
            <span style="color: #6b7280; font-size: 14px; margin-left: 8px;">🕐 ${booking.start_time.slice(0, 5)} - ${booking.end_time.slice(0, 5)}</span>
          </div>
          <span style="color: #3b82f6; font-weight: 600; margin-left: 12px;">฿${amount.toLocaleString()}</span>
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
  <title>Refund Processed - Recurring Booking</title>
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
      border-bottom: 2px solid #6366f1;
    }
    .header h1 {
      color: #6366f1;
      margin: 0;
      font-size: 28px;
    }
    .header-subtitle {
      color: #6b7280;
      font-size: 14px;
      margin-top: 8px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
    }
    .schedule-section {
      background-color: #f8f9fa;
      border-left: 4px solid #6366f1;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .schedule-section h3 {
      color: #1f2937;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .refund-total {
      background-color: #dbeafe;
      border-left: 4px solid #3b82f6;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
      font-size: 16px;
    }
    .total-row.grand-total {
      font-size: 18px;
      font-weight: 700;
      color: #3b82f6;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 2px solid #3b82f6;
    }
    .info-message {
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
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${data.businessLogoUrl}"
           alt="${data.fromName} Logo"
           class="logo"
           style="max-height: 100px; max-width: 200px; margin-bottom: 16px; object-fit: contain;" />
      <h1>💸 Refund Processed</h1>
      <p class="header-subtitle">Recurring Booking - ${data.refundCount} sessions refunded</p>
    </div>

    <div class="greeting">
      Hi ${data.customerName},
    </div>

    <p>We've processed refunds for your ${data.refundCount} recurring bookings of <strong>${data.serviceName}</strong>.</p>

    <div class="schedule-section">
      <h3>📋 Refunded Bookings (${data.refundCount} sessions)</h3>
      ${scheduleListHtml}
    </div>

    <div class="refund-total">
      <div class="total-row">
        <div>Number of bookings refunded:</div>
        <div>${data.refundCount}</div>
      </div>
      <div class="total-row grand-total">
        <div>Total Refund Amount:</div>
        <div>฿${data.totalRefund.toLocaleString()}</div>
      </div>
    </div>

    <div class="info-message">
      <p style="margin: 0;"><strong>📋 Please note:</strong></p>
      <p style="margin: 8px 0 0 0;">The refund will be credited to your original payment method within 5-10 business days, depending on your bank.</p>
    </div>

    <p>If you have any questions about your refund, please don't hesitate to contact us.</p>

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
        We hope to serve you again soon!
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}
