import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BookingData {
  id: string
  booking_date: string
  end_date?: string | null
  start_time: string
  end_time: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  notes?: string
  recurring_group_id?: string
  customers: { full_name: string; email: string }
  service_packages_v2?: { name: string } | null
  profiles?: { full_name: string } | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase env vars not set')

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { bookingId } = await req.json()
    if (!bookingId) throw new Error('Missing bookingId')

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        end_date,
        start_time,
        end_time,
        address,
        city,
        state,
        zip_code,
        notes,
        recurring_group_id,
        customers (full_name, email),
        service_packages_v2 (name),
        profiles:staff_id (full_name)
      `)
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const b = booking as unknown as BookingData
    const serviceName = b.service_packages_v2?.name ?? 'Service'
    const staffName = b.profiles?.full_name ?? undefined
    const location = [b.address, b.city, b.state, b.zip_code].filter(Boolean).join(', ') || undefined

    // Business settings
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
    } catch {
      // continue with defaults
    }

    let emailHtml: string
    let emailSubject: string

    if (b.recurring_group_id) {
      const { data: groupBookings } = await supabase
        .from('bookings')
        .select('id, booking_date, start_time, end_time')
        .eq('recurring_group_id', b.recurring_group_id)
        .order('booking_date')

      if (groupBookings && groupBookings.length > 0) {
        emailHtml = generateRecurringReminderEmail({
          customerName: b.customers.full_name,
          serviceName,
          bookings: groupBookings,
          staffName,
          location,
          notes: b.notes,
          frequency: groupBookings.length,
          fromName,
          businessPhone,
          businessAddress,
          businessLogoUrl,
        })
        emailSubject = `Reminder: Your Upcoming ${serviceName} Sessions (${groupBookings.length} sessions)`
      } else {
        emailHtml = generateSingleReminderEmail({
          customerName: b.customers.full_name,
          serviceName,
          formattedDate: formatDateRange(b.booking_date, b.end_date),
          startTime: b.start_time?.slice(0, 5) ?? '',
          endTime: b.end_time?.slice(0, 5) ?? '',
          staffName,
          location,
          notes: b.notes,
          fromName,
          businessPhone,
          businessAddress,
          businessLogoUrl,
        })
        emailSubject = `Reminder: Your ${serviceName} Appointment Tomorrow`
      }
    } else {
      emailHtml = generateSingleReminderEmail({
        customerName: b.customers.full_name,
        serviceName,
        formattedDate: formatDateRange(b.booking_date, b.end_date),
        startTime: b.start_time?.slice(0, 5) ?? '',
        endTime: b.end_time?.slice(0, 5) ?? '',
        staffName,
        location,
        notes: b.notes,
        fromName,
        businessPhone,
        businessAddress,
        businessLogoUrl,
      })
      emailSubject = `Reminder: Your ${serviceName} Appointment Tomorrow`
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: b.customers.email,
        subject: emailSubject,
        html: emailHtml,
      }),
    })

    const emailResult = await emailResponse.json()
    if (!emailResponse.ok) throw new Error(emailResult.message || 'Failed to send email')

    return new Response(
      JSON.stringify({ success: true, message: 'Reminder sent successfully', data: emailResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error sending reminder email:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatDateRange(startDate: string, endDate?: string | null): string {
  const start = formatDate(startDate)
  if (!endDate || endDate === startDate) return start
  const end = formatDate(endDate)
  return `${start} – ${end}`
}

// ============================================================================
// EMAIL TEMPLATES — Tinedy Brand (inline CSS for email client compatibility)
// Color Palette:
//   tinedy-blue:      #2e4057  (header, borders, labels)
//   tinedy-green:     #8fb996  (accent text in header)
//   tinedy-yellow:    #e7d188  (reminder banner, notes)
//   tinedy-off-white: #f5f3ee  (info card background)
//   tinedy-dark:      #2d241d  (body text)
// ============================================================================

function generateSingleReminderEmail(data: {
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
  const detailRows = [
    { label: '📋 Service', value: data.serviceName },
    { label: '📅 Date', value: data.formattedDate },
    { label: '🕐 Time', value: `${data.startTime} – ${data.endTime}` },
    ...(data.staffName ? [{ label: '👤 Staff', value: data.staffName }] : []),
    ...(data.location ? [{ label: '📍 Location', value: data.location }] : []),
  ]

  const detailRowsHtml = detailRows.map(({ label, value }) => `
    <tr>
      <td style="padding:10px 16px 10px 0;font-weight:600;color:#2e4057;white-space:nowrap;font-size:14px;vertical-align:top;">${label}</td>
      <td style="padding:10px 0;color:#2d241d;font-size:14px;vertical-align:top;">${value}</td>
    </tr>
  `).join('')

  const notesSection = data.notes ? `
    <div style="background-color:#fdf9e8;border-left:4px solid #e7d188;border-radius:4px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-weight:600;color:#2d241d;font-size:14px;">📝 Notes</p>
      <p style="margin:8px 0 0;color:#2d241d;font-size:14px;">${data.notes}</p>
    </div>
  ` : ''

  const footerPhone = data.businessPhone ? `<p style="margin:0 0 4px;font-size:13px;color:#6b6b6b;">📞 ${data.businessPhone}</p>` : ''
  const footerAddress = data.businessAddress ? `<p style="margin:0;font-size:13px;color:#6b6b6b;">📍 ${data.businessAddress}</p>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Booking Reminder</title>
</head>
<body style="margin:0;padding:0;background-color:#f0ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0ede8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#2e4057;padding:32px 40px;text-align:center;">
              <img src="${data.businessLogoUrl}" alt="${data.fromName}" style="max-height:80px;max-width:180px;object-fit:contain;margin-bottom:20px;display:block;margin-left:auto;margin-right:auto;background-color:#ffffff;padding:8px 12px;border-radius:8px;" />
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.3px;">🔔 Appointment Reminder</h1>
              <p style="margin:8px 0 0;color:#e7d188;font-size:15px;font-weight:600;">Your appointment is tomorrow!</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 24px;font-size:16px;color:#2d241d;">Hi <strong>${data.customerName}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#2d241d;line-height:1.6;">Just a friendly reminder about your upcoming appointment with <strong>${data.fromName}</strong>.</p>

              <!-- INFO CARD -->
              <div style="background-color:#f5f3ee;border-left:4px solid #2e4057;border-radius:6px;padding:20px 24px;margin:0 0 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${detailRowsHtml}
                </table>
              </div>

              ${notesSection}

              <p style="margin:24px 0 0;font-size:15px;color:#2d241d;line-height:1.6;">We're looking forward to seeing you! If you need to reschedule, please contact us as soon as possible.</p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#f5f3ee;border-top:1px solid #e8e4df;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#2e4057;">${data.fromName}</p>
              ${footerPhone}${footerAddress}
              <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">This is an automated reminder. Please do not reply directly to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

function generateRecurringReminderEmail(data: {
  customerName: string
  serviceName: string
  bookings: Array<{ id: string; booking_date: string; start_time: string; end_time: string }>
  staffName?: string
  location?: string
  notes?: string
  frequency: number
  fromName: string
  businessPhone: string
  businessAddress: string
  businessLogoUrl: string
}): string {
  const scheduleRowsHtml = data.bookings.map((booking, index) => {
    const formattedDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    })
    const bg = index % 2 === 0 ? '#f5f3ee' : '#ffffff'
    return `
      <tr>
        <td style="padding:10px 12px;background-color:${bg};border-radius:4px;font-weight:700;color:#2e4057;font-size:14px;width:32px;">#${index + 1}</td>
        <td style="padding:10px 12px;background-color:${bg};color:#2d241d;font-size:14px;">📅 ${formattedDate}</td>
        <td style="padding:10px 12px;background-color:${bg};color:#6b6b6b;font-size:13px;">🕐 ${booking.start_time.slice(0, 5)} – ${booking.end_time.slice(0, 5)}</td>
      </tr>
    `
  }).join('')

  const infoRows = [
    { label: '📋 Service', value: data.serviceName },
    ...(data.staffName ? [{ label: '👤 Staff', value: data.staffName }] : []),
    ...(data.location ? [{ label: '📍 Location', value: data.location }] : []),
  ]

  const infoRowsHtml = infoRows.map(({ label, value }) => `
    <tr>
      <td style="padding:10px 16px 10px 0;font-weight:600;color:#2e4057;white-space:nowrap;font-size:14px;vertical-align:top;">${label}</td>
      <td style="padding:10px 0;color:#2d241d;font-size:14px;vertical-align:top;">${value}</td>
    </tr>
  `).join('')

  const notesSection = data.notes ? `
    <div style="background-color:#fdf9e8;border-left:4px solid #e7d188;border-radius:4px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-weight:600;color:#2d241d;font-size:14px;">📝 Notes</p>
      <p style="margin:8px 0 0;color:#2d241d;font-size:14px;">${data.notes}</p>
    </div>
  ` : ''

  const footerPhone = data.businessPhone ? `<p style="margin:0 0 4px;font-size:13px;color:#6b6b6b;">📞 ${data.businessPhone}</p>` : ''
  const footerAddress = data.businessAddress ? `<p style="margin:0;font-size:13px;color:#6b6b6b;">📍 ${data.businessAddress}</p>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Recurring Booking Reminder</title>
</head>
<body style="margin:0;padding:0;background-color:#f0ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0ede8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#2e4057;padding:32px 40px;text-align:center;">
              <img src="${data.businessLogoUrl}" alt="${data.fromName}" style="max-height:80px;max-width:180px;object-fit:contain;margin-bottom:20px;display:block;margin-left:auto;margin-right:auto;background-color:#ffffff;padding:8px 12px;border-radius:8px;" />
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.3px;">🔔 Booking Reminder</h1>
              <p style="margin:8px 0 0;color:#e7d188;font-size:15px;font-weight:600;">Recurring Booking — ${data.frequency} sessions</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 24px;font-size:16px;color:#2d241d;">Hi <strong>${data.customerName}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#2d241d;line-height:1.6;">Here's a reminder about your upcoming sessions with <strong>${data.fromName}</strong>.</p>

              <!-- SERVICE INFO -->
              <div style="background-color:#f5f3ee;border-left:4px solid #2e4057;border-radius:6px;padding:20px 24px;margin:0 0 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">${infoRowsHtml}</table>
              </div>

              <!-- SCHEDULE TABLE -->
              <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#2e4057;">📅 Your Schedule (${data.frequency} sessions)</p>
              <table width="100%" cellpadding="0" cellspacing="2" style="border-collapse:separate;border-spacing:0 4px;">
                ${scheduleRowsHtml}
              </table>

              ${notesSection}

              <p style="margin:24px 0 0;font-size:15px;color:#2d241d;line-height:1.6;">We're looking forward to all your sessions! If you need to reschedule, please contact us.</p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#f5f3ee;border-top:1px solid #e8e4df;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#2e4057;">${data.fromName}</p>
              ${footerPhone}${footerAddress}
              <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">This is an automated reminder. Please do not reply directly to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}
