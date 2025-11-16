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
  address?: string
  city?: string
  state?: string
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
  profiles?: {
    full_name: string
  } | null
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
        address,
        city,
        state,
        recurring_group_id,
        customers (full_name, email),
        service_packages (name),
        service_packages_v2 (name),
        profiles:staff_id (full_name)
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

    // Get staff name if available
    const staffName = bookingData.profiles?.full_name || undefined

    // Get location if available
    const location = [bookingData.address, bookingData.city, bookingData.state]
      .filter(Boolean)
      .join(', ') || undefined

    // Check if this is a recurring booking
    let emailHtml: string

    if (bookingData.recurring_group_id) {
      // Fetch all bookings in the recurring group
      const { data: groupBookings, error: groupError } = await supabase
        .from('bookings')
        .select('id, booking_date, start_time, end_time, total_price')
        .eq('recurring_group_id', bookingData.recurring_group_id)
        .order('booking_date')

      if (groupError || !groupBookings || groupBookings.length === 0) {
        console.warn('Failed to fetch group bookings, falling back to single booking display')
        // Fallback to single booking
        const bookingDate = new Date(bookingData.booking_date)
        const formattedDate = bookingDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })

        emailHtml = generatePaymentConfirmationEmail({
          customerName: bookingData.customers.full_name,
          serviceName,
          formattedDate,
          startTime: bookingData.start_time,
          endTime: bookingData.end_time,
          staffName,
          location,
          totalPrice: bookingData.total_price,
          fromName,
          businessPhone,
          businessAddress,
        })
      } else {
        // Generate recurring booking email
        const totalPrice = groupBookings.reduce((sum: number, b: BookingData) => sum + Number(b.total_price || 0), 0)
        const pricePerBooking = Number(groupBookings[0].total_price || 0)

        emailHtml = generateRecurringPaymentConfirmationEmail({
          customerName: bookingData.customers.full_name,
          serviceName,
          bookings: groupBookings,
          staffName,
          location,
          totalPrice,
          pricePerBooking,
          frequency: groupBookings.length,
          fromName,
          businessPhone,
          businessAddress,
        })
      }
    } else {
      // Single booking - original flow
      const bookingDate = new Date(bookingData.booking_date)
      const formattedDate = bookingDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      emailHtml = generatePaymentConfirmationEmail({
        customerName: bookingData.customers.full_name,
        serviceName,
        formattedDate,
        startTime: bookingData.start_time,
        endTime: bookingData.end_time,
        staffName,
        location,
        totalPrice: bookingData.total_price,
        fromName,
        businessPhone,
        businessAddress,
      })
    }

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
        subject: `Payment Confirmed - ${serviceName}`,
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
      <img src="https://homtefwwsrrwfzmxdnrk.supabase.co/storage/v1/object/public/logo/logo-horizontal.png"
           alt="Tinedy Logo"
           class="logo"
           style="height: 100px; margin-bottom: 16px;" />
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

function generateRecurringPaymentConfirmationEmail(data: {
  customerName: string
  serviceName: string
  bookings: Array<{
    id: string
    booking_date: string
    start_time: string
    end_time: string
    total_price: number
  }>
  staffName?: string
  location?: string
  totalPrice: number
  pricePerBooking: number
  frequency: number
  fromName: string
  businessPhone: string
  businessAddress: string
}): string {
  const scheduleListHtml = data.bookings.map((booking, index) => {
    const bookingDate = new Date(booking.booking_date)
    const formattedDate = bookingDate.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })

    return `
      <div style="display: flex; justify-content: space-between; padding: 12px; background-color: ${index % 2 === 0 ? '#f9fafb' : '#ffffff'}; border-radius: 4px; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-weight: 600; color: #3b82f6; min-width: 40px;">#${index + 1}</span>
          <span style="color: #1f2937;">📅 ${formattedDate}</span>
          <span style="color: #6b7280; font-size: 14px;">🕐 ${booking.start_time.slice(0, 5)} - ${booking.end_time.slice(0, 5)}</span>
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
  <title>Payment Confirmed - Recurring Booking</title>
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
      border-left: 4px solid #3b82f6;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .schedule-section h3 {
      color: #1f2937;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin: 12px 0;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #4F46E5;
    }
    .detail-value {
      color: #333;
    }
    .total-section {
      background-color: #d1fae5;
      border-left: 4px solid #10b981;
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
      font-size: 16px;
      font-weight: 700;
      color: #10b981;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 2px solid #10b981;
    }
    .success-message {
      background-color: #dbeafe;
      border-left: 4px solid #3b82f6;
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
      <img src="https://homtefwwsrrwfzmxdnrk.supabase.co/storage/v1/object/public/logo/logo-horizontal.png"
           alt="Tinedy Logo"
           class="logo"
           style="height: 100px; margin-bottom: 16px;" />
      <h1>✅ Payment Confirmed!</h1>
      <p class="header-subtitle">Recurring Booking - ${data.frequency} sessions</p>
    </div>

    <div class="greeting">
      Hi ${data.customerName},
    </div>

    <p>We've received your payment. Your ${data.frequency} recurring bookings are now fully confirmed!</p>

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
    ${data.location ? `
    <div class="detail-row">
      <div class="detail-label">Location:</div>
      <div class="detail-value">${data.location}</div>
    </div>
    ` : ''}

    <div class="schedule-section">
      <h3>📅 Your Schedule (${data.frequency} sessions)</h3>
      ${scheduleListHtml}
    </div>

    <div class="total-section">
      <div class="total-row">
        <div>Price per session:</div>
        <div>฿${data.pricePerBooking.toLocaleString()}</div>
      </div>
      <div class="total-row">
        <div>Number of sessions:</div>
        <div>${data.frequency}</div>
      </div>
      <div class="total-row grand-total">
        <div>Total Amount Paid:</div>
        <div>฿${data.totalPrice.toLocaleString()}</div>
      </div>
    </div>

    <div class="success-message">
      <p><strong>You're all set!</strong></p>
      <p>We'll send you a reminder before each appointment.</p>
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
