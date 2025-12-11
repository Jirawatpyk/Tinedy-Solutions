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
  address?: string
  city?: string
  state?: string
  zip_code?: string
  notes?: string
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
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not set')
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get bookingId from request
    const { bookingId } = await req.json()

    if (!bookingId) {
      throw new Error('Missing bookingId')
    }

    console.log('Fetching booking reminder data for:', bookingId)

    // Fetch booking data from database
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        address,
        city,
        state,
        zip_code,
        notes,
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
    const location = [bookingData.address, bookingData.city, bookingData.state, bookingData.zip_code]
      .filter(Boolean)
      .join(', ') || undefined

    // Fetch business settings
    let fromName = 'Tinedy CRM'
    let fromEmail = 'bookings@resend.dev'
    let businessPhone = ''
    let businessAddress = ''
    let businessLogoUrl = 'https://homtefwwsrrwfzmxdnrk.supabase.co/storage/v1/object/public/logo/logo-horizontal.png'

    try {
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
    } catch (error) {
      console.warn('Failed to fetch settings, using defaults:', error)
    }

    // Check if this is a recurring booking
    let emailHtml: string
    let emailSubject: string

    if (bookingData.recurring_group_id) {
      // Fetch all bookings in the recurring group
      const { data: groupBookings, error: groupError } = await supabase
        .from('bookings')
        .select('id, booking_date, start_time, end_time')
        .eq('recurring_group_id', bookingData.recurring_group_id)
        .order('booking_date')

      if (groupError || !groupBookings || groupBookings.length === 0) {
        console.warn('Failed to fetch group bookings, falling back to single booking reminder')
        // Fallback to single booking
        const bookingDate = new Date(bookingData.booking_date)
        const formattedDate = bookingDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })

        emailHtml = generateSingleBookingReminderEmail({
          customerName: bookingData.customers.full_name,
          serviceName,
          formattedDate,
          startTime: bookingData.start_time,
          endTime: bookingData.end_time,
          staffName,
          location,
          notes: bookingData.notes,
          fromName,
          businessPhone,
          businessAddress,
          businessLogoUrl,
        })
        emailSubject = `Reminder: Your ${serviceName} Appointment Tomorrow`
      } else {
        // Generate recurring booking reminder email
        emailHtml = generateRecurringBookingReminderEmail({
          customerName: bookingData.customers.full_name,
          serviceName,
          bookings: groupBookings,
          staffName,
          location,
          notes: bookingData.notes,
          frequency: groupBookings.length,
          fromName,
          businessPhone,
          businessAddress,
          businessLogoUrl,
        })
        emailSubject = `Reminder: Your Upcoming ${serviceName} Sessions (${groupBookings.length} sessions)`
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

      emailHtml = generateSingleBookingReminderEmail({
        customerName: bookingData.customers.full_name,
        serviceName,
        formattedDate,
        startTime: bookingData.start_time,
        endTime: bookingData.end_time,
        staffName,
        location,
        notes: bookingData.notes,
        fromName,
        businessPhone,
        businessAddress,
        businessLogoUrl,
      })
      emailSubject = `Reminder: Your ${serviceName} Appointment Tomorrow`
    }

    // Send email via Resend
    console.log('Sending reminder email to:', bookingData.customers.email)
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: bookingData.customers.email,
        subject: emailSubject,
        html: emailHtml,
      }),
    })

    console.log('Email API response status:', emailResponse.status)
    const emailResult = await emailResponse.json()

    if (!emailResponse.ok) {
      console.error('Email API error:', emailResult)
      throw new Error(emailResult.message || 'Failed to send email')
    }

    console.log('Reminder email sent successfully')
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reminder email sent successfully',
        data: emailResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error sending reminder email:', error)
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

// Generate single booking reminder email
function generateSingleBookingReminderEmail(data: {
  customerName: string
  serviceName: string
  formattedDate: string
  startTime: string
  endTime: string
  staffName?: string
  location?: string
  notes?: string
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
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${data.businessLogoUrl}"
           alt="${data.fromName} Logo"
           class="logo"
           style="max-height: 100px; max-width: 200px; margin-bottom: 16px; object-fit: contain;" />
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
      ${data.staffName ? `
      <div class="detail-row">
        <div class="detail-label">Staff:</div>
        <div class="detail-value">${data.staffName}</div>
      </div>
      ` : ''}
      <div class="detail-row">
        <div class="detail-label">Date:</div>
        <div class="detail-value">${data.formattedDate}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Time:</div>
        <div class="detail-value">${data.startTime.slice(0, 5)} - ${data.endTime.slice(0, 5)}</div>
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
        This is an automated reminder email. Please do not reply to this message.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

// Generate recurring booking reminder email
function generateRecurringBookingReminderEmail(data: {
  customerName: string
  serviceName: string
  bookings: Array<{
    id: string
    booking_date: string
    start_time: string
    end_time: string
  }>
  staffName?: string
  location?: string
  notes?: string
  frequency: number
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

    return `
      <div style="display: flex; justify-content: space-between; padding: 12px; background-color: ${index % 2 === 0 ? '#f9fafb' : '#ffffff'}; border-radius: 4px; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-weight: 600; color: #4F46E5; min-width: 40px;">#${index + 1}</span>
          <span style="color: #1f2937;">📅 ${formattedDate}</span>
          <span style="color: #6b7280; font-size: 14px; margin-left: 8px;">🕐 ${booking.start_time.slice(0, 5)} - ${booking.end_time.slice(0, 5)}</span>
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
  <title>Recurring Booking Reminder</title>
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
    .header-subtitle {
      color: #6b7280;
      font-size: 14px;
      margin-top: 8px;
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
      background-color: #f8f9fa;
      border-left: 4px solid #4F46E5;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .schedule-section h3 {
      color: #1f2937;
      margin-top: 0;
      margin-bottom: 16px;
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
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${data.businessLogoUrl}"
           alt="${data.fromName} Logo"
           class="logo"
           style="max-height: 100px; max-width: 200px; margin-bottom: 16px; object-fit: contain;" />
      <h1>🔔 Booking Reminder</h1>
      <p class="header-subtitle">Recurring Booking - ${data.frequency} sessions</p>
    </div>

    <div class="greeting">
      Hi ${data.customerName},
    </div>

    <p>This is a friendly reminder about your upcoming appointments with ${data.fromName}.</p>

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

    <div class="schedule-section">
      <h3>📅 Your Schedule (${data.frequency} sessions)</h3>
      ${scheduleListHtml}
    </div>

    <p>We're looking forward to seeing you at all your sessions!</p>

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
        This is an automated reminder email. Please do not reply to this message.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}
