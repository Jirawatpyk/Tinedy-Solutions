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
  total_price: number
  amount_paid: number
  recurring_group_id?: string
  customers: { full_name: string; email: string }
  service_packages_v2?: { name: string } | null
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
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase configuration is missing')

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
    } catch { /* continue */ }

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        end_date,
        start_time,
        end_time,
        total_price,
        amount_paid,
        recurring_group_id,
        customers (full_name, email),
        service_packages_v2 (name)
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
    const refundAmount = b.amount_paid || b.total_price || 0

    let emailHtml: string
    let refundCount = 1

    if (b.recurring_group_id) {
      const { data: groupBookings } = await supabase
        .from('bookings')
        .select('id, booking_date, start_time, end_time, total_price, amount_paid')
        .eq('recurring_group_id', b.recurring_group_id)
        .eq('payment_status', 'refunded')
        .order('booking_date')

      if (groupBookings && groupBookings.length > 1) {
        refundCount = groupBookings.length
        const totalRefund = groupBookings.reduce((sum, gb) => sum + Number(gb.amount_paid || gb.total_price || 0), 0)
        emailHtml = generateRecurringRefundEmail({
          customerName: escapeHtml(b.customers.full_name),
          serviceName: escapeHtml(serviceName),
          bookings: groupBookings,
          totalRefund,
          refundCount,
          fromName: escapeHtml(fromName),
          businessPhone: escapeHtml(businessPhone),
          businessAddress: escapeHtml(businessAddress),
          businessLogoUrl,
        })
      } else {
        emailHtml = generateSingleRefundEmail({
          customerName: escapeHtml(b.customers.full_name),
          serviceName: escapeHtml(serviceName),
          formattedDate: escapeHtml(formatDateRange(b.booking_date, b.end_date)),
          startTime: b.start_time?.slice(0, 5) ?? '',
          endTime: b.end_time?.slice(0, 5) ?? '',
          refundAmount,
          fromName: escapeHtml(fromName),
          businessPhone: escapeHtml(businessPhone),
          businessAddress: escapeHtml(businessAddress),
          businessLogoUrl,
        })
      }
    } else {
      emailHtml = generateSingleRefundEmail({
        customerName: b.customers.full_name,
        serviceName,
        formattedDate: formatDateRange(b.booking_date, b.end_date),
        startTime: b.start_time?.slice(0, 5) ?? '',
        endTime: b.end_time?.slice(0, 5) ?? '',
        refundAmount,
        fromName,
        businessPhone,
        businessAddress,
        businessLogoUrl,
      })
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: b.customers.email,
        subject: `Refund Processed — ${serviceName}`,
        html: emailHtml,
      }),
    })

    const emailResult = await emailResponse.json()
    if (!emailResponse.ok) throw new Error(emailResult.message || 'Failed to send email')

    // Log to email_queue for tracking
    try {
      await supabase.from('email_queue').insert({
        booking_id: bookingId,
        email_type: 'refund_confirmation',
        recipient_email: b.customers.email,
        recipient_name: b.customers.full_name,
        subject: `Refund Processed — ${serviceName}`,
        html_content: '',
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
    } catch { /* ignore tracking errors */ }

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResult.id,
        message: refundCount > 1 ? `Refund confirmation sent for ${refundCount} bookings` : 'Refund confirmation sent',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-refund-confirmation:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
//   tinedy-blue:      #2e4057  (header bg, borders, labels)
//   tinedy-green:     #8fb996  (refund amount highlight)
//   tinedy-yellow:    #e7d188  (info/notes banner)
//   tinedy-off-white: #f5f3ee  (info card bg)
//   tinedy-dark:      #2d241d  (body text)
//   background:       #f0ede8
// ============================================================================

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
  const footerPhone = data.businessPhone ? `<p style="margin:0 0 4px;font-size:13px;color:#6b6b6b;">📞 ${data.businessPhone}</p>` : ''
  const footerAddress = data.businessAddress ? `<p style="margin:0;font-size:13px;color:#6b6b6b;">📍 ${data.businessAddress}</p>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Refund Processed</title>
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
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.3px;">💸 Refund Processed</h1>
              <p style="margin:8px 0 0;color:#8fb996;font-size:15px;">Your refund has been issued.</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 24px;font-size:16px;color:#2d241d;">Hi <strong>${data.customerName}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#2d241d;line-height:1.6;">We've processed your refund for the following booking:</p>

              <!-- INFO CARD -->
              <div style="background-color:#f5f3ee;border-left:4px solid #2e4057;border-radius:6px;padding:20px 24px;margin:0 0 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:10px 16px 10px 0;font-weight:600;color:#2e4057;white-space:nowrap;font-size:14px;vertical-align:top;">📋 Service</td>
                    <td style="padding:10px 0;color:#2d241d;font-size:14px;vertical-align:top;">${data.serviceName}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px 10px 0;font-weight:600;color:#2e4057;white-space:nowrap;font-size:14px;vertical-align:top;">📅 Date</td>
                    <td style="padding:10px 0;color:#2d241d;font-size:14px;vertical-align:top;">${data.formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px 10px 0;font-weight:600;color:#2e4057;white-space:nowrap;font-size:14px;vertical-align:top;">🕐 Time</td>
                    <td style="padding:10px 0;color:#2d241d;font-size:14px;vertical-align:top;">${data.startTime} – ${data.endTime}</td>
                  </tr>
                </table>
              </div>

              <!-- REFUND AMOUNT -->
              <div style="background-color:#f5f3ee;border:2px solid #8fb996;border-radius:8px;padding:20px 24px;margin:0 0 24px;text-align:center;">
                <p style="margin:0 0 8px;color:#2d241d;font-size:14px;">Refund Amount</p>
                <p style="margin:0;color:#8fb996;font-size:32px;font-weight:700;">฿${data.refundAmount.toLocaleString('th-TH')}</p>
              </div>

              <!-- INFO BANNER -->
              <div style="background-color:#fdf9e8;border-left:4px solid #e7d188;border-radius:4px;padding:16px 20px;margin:0 0 24px;">
                <p style="margin:0;font-weight:600;color:#2d241d;font-size:14px;">📋 Please note</p>
                <p style="margin:8px 0 0;color:#2d241d;font-size:14px;line-height:1.6;">The refund will be credited to your original payment method within 5–10 business days, depending on your bank.</p>
              </div>

              <p style="margin:0;font-size:14px;color:#6b6b6b;line-height:1.6;">If you have any questions about your refund, please contact us.</p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#f5f3ee;border-top:1px solid #e8e4df;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#2e4057;">${data.fromName}</p>
              ${footerPhone}${footerAddress}
              <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">We hope to serve you again soon!</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

function generateRecurringRefundEmail(data: {
  customerName: string
  serviceName: string
  bookings: Array<{ id: string; booking_date: string; start_time: string; end_time: string; total_price: number; amount_paid: number }>
  totalRefund: number
  refundCount: number
  fromName: string
  businessPhone: string
  businessAddress: string
  businessLogoUrl: string
}): string {
  const scheduleRowsHtml = data.bookings.map((booking, index) => {
    const formattedDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    })
    const amount = booking.amount_paid || booking.total_price || 0
    const bg = index % 2 === 0 ? '#f5f3ee' : '#ffffff'
    return `
      <tr>
        <td style="padding:10px 12px;background-color:${bg};font-weight:700;color:#2e4057;font-size:14px;width:36px;">#${index + 1}</td>
        <td style="padding:10px 12px;background-color:${bg};color:#2d241d;font-size:14px;">📅 ${formattedDate}</td>
        <td style="padding:10px 12px;background-color:${bg};color:#6b6b6b;font-size:13px;">🕐 ${booking.start_time.slice(0, 5)} – ${booking.end_time.slice(0, 5)}</td>
        <td style="padding:10px 12px;background-color:${bg};color:#8fb996;font-size:14px;font-weight:600;text-align:right;">฿${amount.toLocaleString('th-TH')}</td>
      </tr>
    `
  }).join('')

  const footerPhone = data.businessPhone ? `<p style="margin:0 0 4px;font-size:13px;color:#6b6b6b;">📞 ${data.businessPhone}</p>` : ''
  const footerAddress = data.businessAddress ? `<p style="margin:0;font-size:13px;color:#6b6b6b;">📍 ${data.businessAddress}</p>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Refund Processed</title>
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
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.3px;">💸 Refund Processed</h1>
              <p style="margin:8px 0 0;color:#8fb996;font-size:15px;font-weight:600;">Recurring Booking — ${data.refundCount} sessions refunded</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 24px;font-size:16px;color:#2d241d;">Hi <strong>${data.customerName}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#2d241d;line-height:1.6;">We've processed refunds for your ${data.refundCount} recurring sessions of <strong>${data.serviceName}</strong>.</p>

              <!-- REFUNDED SESSIONS TABLE -->
              <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#2e4057;">📋 Refunded Sessions (${data.refundCount})</p>
              <table width="100%" cellpadding="0" cellspacing="2" style="border-collapse:separate;border-spacing:0 4px;margin-bottom:24px;">
                ${scheduleRowsHtml}
              </table>

              <!-- TOTAL REFUND -->
              <div style="background-color:#f5f3ee;border:2px solid #8fb996;border-radius:8px;padding:20px 24px;margin:0 0 24px;text-align:center;">
                <p style="margin:0 0 8px;color:#2d241d;font-size:14px;">Total Refund Amount</p>
                <p style="margin:0;color:#8fb996;font-size:32px;font-weight:700;">฿${data.totalRefund.toLocaleString('th-TH')}</p>
              </div>

              <!-- INFO BANNER -->
              <div style="background-color:#fdf9e8;border-left:4px solid #e7d188;border-radius:4px;padding:16px 20px;margin:0 0 24px;">
                <p style="margin:0;font-weight:600;color:#2d241d;font-size:14px;">📋 Please note</p>
                <p style="margin:8px 0 0;color:#2d241d;font-size:14px;line-height:1.6;">The refund will be credited to your original payment method within 5–10 business days, depending on your bank.</p>
              </div>

              <p style="margin:0;font-size:14px;color:#6b6b6b;line-height:1.6;">If you have any questions about your refund, please contact us.</p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#f5f3ee;border-top:1px solid #e8e4df;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#2e4057;">${data.fromName}</p>
              ${footerPhone}${footerAddress}
              <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">We hope to serve you again soon!</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}
