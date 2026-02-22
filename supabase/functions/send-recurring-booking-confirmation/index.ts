import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// HTML escape helper — prevents XSS in email templates
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
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

    // Auth: verify caller is admin or manager
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', caller.id).single()
    if (!callerProfile || !['admin', 'manager'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { bookingId } = await req.json()
    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'Missing bookingId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch the primary booking to get group ID + customer/service info
    const { data: primary, error: primaryError } = await supabase
      .from('bookings')
      .select(`
        id,
        start_time,
        end_time,
        total_price,
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

    if (primaryError || !primary) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join types are not inferred in edge functions
    const p = primary as Record<string, any>
    const customerName: string = p.customers?.full_name ?? 'Customer'
    const customerEmail: string = p.customers?.email ?? ''
    if (!customerEmail) {
      return new Response(JSON.stringify({ error: 'Customer has no email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const serviceName: string = p.service_packages_v2?.name ?? 'Service'
    const staffName: string | undefined = p.profiles?.full_name ?? undefined
    const location = [p.address, p.city, p.state, p.zip_code].filter(Boolean).join(', ') || undefined

    // Fetch all bookings in recurring group
    const groupId = p.recurring_group_id
    let allBookings: Array<{ booking_date: string; start_time: string; end_time: string; total_price: number }> = []

    if (groupId) {
      const { data: groupData } = await supabase
        .from('bookings')
        .select('booking_date, start_time, end_time, total_price')
        .eq('recurring_group_id', groupId)
        .order('booking_date')

      if (groupData && groupData.length > 0) {
        allBookings = groupData
      }
    }

    // Fallback: just this booking if not a group
    if (allBookings.length === 0) {
      const { data: single } = await supabase
        .from('bookings')
        .select('booking_date, start_time, end_time, total_price')
        .eq('id', bookingId)
        .single()
      if (single) allBookings = [single]
    }

    const frequency = allBookings.length
    const totalPrice = allBookings.reduce((sum, b) => sum + Number(b.total_price ?? 0), 0)
    const pricePerBooking = frequency > 0 ? Math.round(totalPrice / frequency) : 0

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

    const emailHtml = generateRecurringConfirmationEmail({
      customerName: escapeHtml(customerName),
      serviceName: escapeHtml(serviceName),
      bookings: allBookings,
      startTime: p.start_time?.slice(0, 5) ?? '',
      endTime: p.end_time?.slice(0, 5) ?? '',
      totalPrice,
      pricePerBooking,
      frequency,
      staffName: staffName ? escapeHtml(staffName) : undefined,
      location: location ? escapeHtml(location) : undefined,
      notes: p.notes ? escapeHtml(p.notes) : undefined,
      fromName: escapeHtml(fromName),
      businessPhone: escapeHtml(businessPhone),
      businessAddress: escapeHtml(businessAddress),
      businessLogoUrl,
    })

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: customerEmail,
        subject: `Recurring Booking Confirmed — ${serviceName} (${frequency} sessions)`,
        html: emailHtml,
      }),
    })

    const responseData = await response.json()
    if (!response.ok) throw new Error(responseData.message || 'Failed to send email')

    // Queue for tracking
    try {
      await supabase.from('email_queue').insert({
        booking_id: bookingId,
        email_type: 'recurring_booking_confirmation',
        recipient_email: customerEmail,
        recipient_name: customerName,
        subject: `Recurring Booking Confirmed — ${serviceName} (${frequency} sessions)`,
        html_content: '',
        status: 'pending',
      })
    } catch { /* ignore tracking errors */ }

    return new Response(
      JSON.stringify({ success: true, message: 'Recurring confirmation sent successfully', data: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================================================
// EMAIL TEMPLATE — Tinedy Brand (inline CSS for email client compatibility)
// Color Palette:
//   tinedy-blue:      #2e4057  (header bg, borders, labels)
//   tinedy-green:     #8fb996  (price accent, subtitle)
//   tinedy-yellow:    #e7d188  (notes section)
//   tinedy-off-white: #f5f3ee  (info card bg)
//   tinedy-dark:      #2d241d  (body text)
//   background:       #f0ede8
// ============================================================================
function generateRecurringConfirmationEmail(data: {
  customerName: string
  serviceName: string
  bookings: Array<{ booking_date: string; start_time: string; end_time: string; total_price: number }>
  startTime: string
  endTime: string
  totalPrice: number
  pricePerBooking: number
  frequency: number
  staffName?: string
  location?: string
  notes?: string
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
        <td style="padding:10px 12px;background-color:${bg};font-weight:700;color:#2e4057;font-size:14px;border-radius:4px;width:36px;">#${index + 1}</td>
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
  <title>Recurring Booking Confirmed</title>
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
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.3px;">✅ Recurring Booking Confirmed!</h1>
              <p style="margin:8px 0 0;color:#8fb996;font-size:15px;font-weight:600;">${data.frequency} sessions scheduled</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 24px;font-size:16px;color:#2d241d;">Hi <strong>${data.customerName}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#2d241d;line-height:1.6;">Thank you for booking with <strong>${data.fromName}</strong>! Your ${data.frequency} recurring appointments have been confirmed.</p>

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

              <!-- PRICING SUMMARY -->
              <div style="background-color:#f5f3ee;border:1px solid #e8e4df;border-radius:8px;padding:20px 24px;margin:24px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;color:#2d241d;font-size:14px;">Price per session</td>
                    <td style="padding:6px 0;color:#2d241d;font-size:14px;text-align:right;">฿${data.pricePerBooking.toLocaleString('th-TH')}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#2d241d;font-size:14px;">Sessions</td>
                    <td style="padding:6px 0;color:#2d241d;font-size:14px;text-align:right;">× ${data.frequency}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0 6px;border-top:2px solid #2e4057;font-weight:700;color:#2e4057;font-size:15px;">Total Amount</td>
                    <td style="padding:12px 0 6px;border-top:2px solid #2e4057;font-weight:700;color:#8fb996;font-size:22px;text-align:right;">฿${data.totalPrice.toLocaleString('th-TH')}</td>
                  </tr>
                </table>
              </div>

              <p style="margin:0;font-size:14px;color:#6b6b6b;line-height:1.6;">If you have any questions or need to make changes, please contact us.</p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#f5f3ee;border-top:1px solid #e8e4df;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#2e4057;">${data.fromName}</p>
              ${footerPhone}${footerAddress}
              <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">This is an automated message. Please do not reply directly to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}
