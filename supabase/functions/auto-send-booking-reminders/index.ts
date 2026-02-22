import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BATCH_SIZE = 10
const DEFAULT_REMINDER_HOURS = 24

/**
 * Orchestrator Edge Function — auto-send-booking-reminders
 *
 * Runs every hour via cron (0 * * * *).
 * Queries confirmed bookings within the reminder window that haven't been
 * sent a reminder yet (checked via email_queue), then calls the existing
 * send-booking-reminder worker for each booking in batches of 10.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const cronSecret = Deno.env.get('CRON_SECRET')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    // Auth guard: only allow cron (with secret) or service-role calls
    const authHeader = req.headers.get('Authorization')
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // If not cron secret, verify it's a service-role key
      if (authHeader !== `Bearer ${supabaseServiceKey}`) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1. Get reminder_hours from settings (fallback to 24)
    let reminderHours = DEFAULT_REMINDER_HOURS
    try {
      const { data: settings } = await supabase
        .from('settings')
        .select('reminder_hours')
        .limit(1)
        .maybeSingle()

      if (settings?.reminder_hours && settings.reminder_hours > 0) {
        reminderHours = settings.reminder_hours
      }
    } catch {
      // Use default
    }

    // 2. Calculate time window (UTC)
    // Window: from now to now + reminderHours (e.g. 24h ahead)
    const nowUtc = new Date()
    const windowEnd = new Date(nowUtc.getTime() + reminderHours * 60 * 60 * 1000)
    const nowUtcIso = nowUtc.toISOString()
    const windowEndUtc = windowEnd.toISOString()

    console.log(`[auto-reminder] reminder_hours=${reminderHours}, window: ${nowUtcIso} -> ${windowEndUtc}`)

    // 3. Query bookings that need reminders
    // Using raw SQL via rpc for complex query with NOT EXISTS subquery
    const { data: bookings, error: queryError } = await supabase
      .rpc('get_bookings_for_reminder', {
        p_now: nowUtcIso,
        p_window_end: windowEndUtc,
      })

    // If RPC doesn't exist, fallback to direct query
    let eligibleBookings = bookings

    if (queryError) {
      console.log('[auto-reminder] RPC not available, using direct query')

      // Direct query approach
      const { data: directBookings, error: directError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          customers!inner (id, email, full_name, deleted_at)
        `)
        .eq('status', 'confirmed')
        .is('deleted_at', null)
        .not('customers.email', 'is', null)
        .is('customers.deleted_at', null)

      if (directError) {
        throw new Error(`Query error: ${directError.message}`)
      }

      if (!directBookings || directBookings.length === 0) {
        return new Response(
          JSON.stringify({ success: true, found: 0, sent: 0, failed: 0, message: 'No bookings need reminders' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      // Filter by time window in application layer
      const filtered = directBookings.filter((b) => {
        const startTime = b.start_time ? b.start_time.slice(0, 5) : '00:00'
        const bookingDatetime = new Date(`${b.booking_date}T${startTime}:00+07:00`)
        return bookingDatetime > nowUtc && bookingDatetime <= new Date(windowEndUtc)
      })

      // Filter out bookings that already have email_queue records
      if (filtered.length > 0) {
        const bookingIds = filtered.map((b) => b.id)
        const { data: existingQueue } = await supabase
          .from('email_queue')
          .select('booking_id')
          .in('booking_id', bookingIds)
          .eq('email_type', 'booking_reminder')

        const sentBookingIds = new Set((existingQueue || []).map((q) => q.booking_id))
        eligibleBookings = filtered.filter((b) => !sentBookingIds.has(b.id))
      } else {
        eligibleBookings = []
      }
    }

    if (!eligibleBookings || eligibleBookings.length === 0) {
      console.log('[auto-reminder] No eligible bookings found')
      return new Response(
        JSON.stringify({ success: true, found: 0, sent: 0, failed: 0, message: 'No bookings need reminders' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`[auto-reminder] Found ${eligibleBookings.length} bookings to remind`)

    // 4. Process in batches of BATCH_SIZE
    const results = { found: eligibleBookings.length, sent: 0, failed: 0, errors: [] as string[] }

    for (let i = 0; i < eligibleBookings.length; i += BATCH_SIZE) {
      const batch = eligibleBookings.slice(i, i + BATCH_SIZE)

      const batchResults = await Promise.allSettled(
        batch.map(async (booking: { id: string }) => {
          const response = await fetch(`${supabaseUrl}/functions/v1/send-booking-reminder`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              ...(cronSecret ? { 'X-Internal-Secret': cronSecret } : {}),
            },
            body: JSON.stringify({ bookingId: booking.id }),
          })

          const result = await response.json()

          if (!response.ok && !result.skipped) {
            throw new Error(result.error || `HTTP ${response.status}`)
          }

          return result
        })
      )

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          if (result.value.skipped) {
            // Already sent — don't count as new send
          } else {
            results.sent++
          }
        } else {
          results.failed++
          results.errors.push(result.reason?.message || 'Unknown error')
        }
      }
    }

    const message = `Processed ${results.found} bookings: ${results.sent} sent, ${results.failed} failed`
    console.log(`[auto-reminder] ${message}`)

    return new Response(
      JSON.stringify({ success: true, ...results, message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('[auto-reminder] Error:', error instanceof Error ? error.message : error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
