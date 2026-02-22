-- ============================================================
-- Setup Cron Job: auto-send-booking-reminders (every hour)
-- ============================================================
-- Prerequisites:
--   1. Enable pg_cron extension (Database → Extensions → pg_cron)
--   2. Enable pg_net extension  (Database → Extensions → pg_net)
--   3. Set Edge Function secret: CRON_SECRET
--   4. Deploy Edge Function: auto-send-booking-reminders
-- ============================================================

-- Remove existing schedule if re-running
SELECT cron.unschedule('auto-send-booking-reminders')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-send-booking-reminders'
);

-- Schedule: every hour at minute 0
SELECT cron.schedule(
  'auto-send-booking-reminders',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/auto-send-booking-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <YOUR_CRON_SECRET>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
