import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface BookingData {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  total_price: number
  location?: string
  notes?: string
  customers: {
    full_name: string
    email: string
  }
  service_packages: {
    name: string
  }
  staff_profiles?: {
    full_name: string
  }
}

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const { bookingId } = await req.json()

    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'Missing bookingId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch booking data
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        total_price,
        location,
        notes,
        customers (full_name, email),
        service_packages (name),
        staff_profiles (full_name)
      `)
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      console.error('Error fetching booking:', fetchError)
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const bookingData = booking as unknown as BookingData

    // Format date
    const bookingDate = new Date(bookingData.booking_date)
    const formattedDate = bookingDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Generate email HTML
    const emailHtml = generatePaymentConfirmationEmail({
      customerName: bookingData.customers.full_name,
      serviceName: bookingData.service_packages.name,
      formattedDate,
      startTime: bookingData.start_time,
      endTime: bookingData.end_time,
      staffName: bookingData.staff_profiles?.full_name,
      location: bookingData.location,
      totalPrice: bookingData.total_price,
    })

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Tinedy CRM <noreply@resend.dev>',
        to: bookingData.customers.email,
        subject: `Payment Confirmed - ${bookingData.service_packages.name}`,
        html: emailHtml,
      }),
    })

    const emailResult = await emailResponse.json()

    if (!emailResponse.ok) {
      console.error('Resend error:', emailResult)
      throw new Error(emailResult.message || 'Failed to send email')
    }

    // Queue email in database
    await supabase.from('email_queue').insert({
      booking_id: bookingId,
      email_type: 'payment_confirmation',
      recipient_email: bookingData.customers.email,
      recipient_name: bookingData.customers.full_name,
      subject: `Payment Confirmed - ${bookingData.service_packages.name}`,
      html_content: emailHtml,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    console.log('Payment confirmation email sent:', emailResult)

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResult.id,
        message: 'Payment confirmation email sent successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      <strong>Tinedy CRM</strong>
      <div class="footer-note">
        Looking forward to seeing you!
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}
