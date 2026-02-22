import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'Missing bookingId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch booking with all needed relations
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        end_date,
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

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join types are not inferred in edge functions
    const b = booking as Record<string, any>
    const customerName: string = b.customers?.full_name ?? 'Customer'
    const customerEmail: string = b.customers?.email ?? ''
    if (!customerEmail) {
      return new Response(JSON.stringify({ error: 'Customer has no email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const serviceName: string = b.service_packages_v2?.name ?? 'Service'
    const staffName: string | undefined = b.profiles?.full_name ?? undefined
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

    const formatSingleDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    const startDateStr = formatSingleDate(b.booking_date)
    const bookingDateFormatted = b.end_date && b.end_date !== b.booking_date
      ? `${startDateStr} – ${formatSingleDate(b.end_date)}`
      : startDateStr

    const emailHtml = generateBookingConfirmationEmail({
      customerName,
      serviceName,
      bookingDateFormatted,
      startTime: b.start_time?.slice(0, 5) ?? '',
      endTime: b.end_time?.slice(0, 5) ?? '',
      totalPrice: b.total_price ?? 0,
      staffName,
      location,
      notes: b.notes ?? undefined,
      fromName,
      businessPhone,
      businessAddress,
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
        subject: `Booking Confirmed — ${serviceName}`,
        html: emailHtml,
      }),
    })

    const responseData = await response.json()
    if (!response.ok) throw new Error(responseData.message || 'Failed to send email')

    // Queue for tracking
    await supabase.from('email_queue').insert({
      booking_id: bookingId,
      email_type: 'booking_confirmation',
      recipient_email: customerEmail,
      recipient_name: customerName,
      subject: `Booking Confirmed — ${serviceName}`,
      html_content: '',
      status: 'pending',
    }).catch(() => {})

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully', data: responseData }),
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
// EMAIL TEMPLATE — Tinedy Brand
// All styles are INLINE for email client compatibility (Gmail, Outlook)
// Color Palette:
//   tinedy-blue:      #2e4057  (header, borders, labels, button)
//   tinedy-green:     #8fb996  (price, success accent)
//   tinedy-yellow:    #e7d188  (notes section)
//   tinedy-off-white: #f5f3ee  (info card background)
//   tinedy-dark:      #2d241d  (body text)
// ============================================================================
function generateBookingConfirmationEmail(data: {
  customerName: string
  serviceName: string
  bookingDateFormatted: string
  startTime: string
  endTime: string
  totalPrice: number
  staffName?: string
  location?: string
  notes?: string
  fromName: string
  businessPhone: string
  businessAddress: string
  businessLogoUrl: string
}): string {
  const priceFormatted = `฿${data.totalPrice.toLocaleString('th-TH')}`

  const detailRows = [
    { label: '📋 Service', value: data.serviceName },
    { label: '📅 Date', value: data.bookingDateFormatted },
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

  const footerPhone = data.businessPhone
    ? `<p style="margin:0 0 4px;font-size:13px;color:#6b6b6b;">📞 ${data.businessPhone}</p>`
    : ''
  const footerAddress = data.businessAddress
    ? `<p style="margin:0;font-size:13px;color:#6b6b6b;">📍 ${data.businessAddress}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Booking Confirmed</title>
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
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.3px;">✅ Booking Confirmed!</h1>
              <p style="margin:8px 0 0;color:#8fb996;font-size:15px;">Your appointment is all set.</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 24px;font-size:16px;color:#2d241d;">Hi <strong>${data.customerName}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#2d241d;line-height:1.6;">Thank you for booking with <strong>${data.fromName}</strong>! Here are your appointment details:</p>

              <!-- INFO CARD -->
              <div style="background-color:#f5f3ee;border-left:4px solid #2e4057;border-radius:6px;padding:20px 24px;margin:0 0 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${detailRowsHtml}
                  <tr>
                    <td style="padding:10px 16px 10px 0;font-weight:600;color:#2e4057;white-space:nowrap;font-size:14px;border-top:1px solid #e8e4df;vertical-align:top;">💰 Total</td>
                    <td style="padding:10px 0;font-size:20px;font-weight:700;color:#8fb996;border-top:1px solid #e8e4df;vertical-align:top;">${priceFormatted}</td>
                  </tr>
                </table>
              </div>

              ${notesSection}

              <p style="margin:24px 0 0;font-size:14px;color:#6b6b6b;line-height:1.6;">If you have any questions or need to reschedule, please contact us.</p>
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
