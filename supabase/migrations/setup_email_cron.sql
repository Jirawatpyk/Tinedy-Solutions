-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant permission to use pg_cron
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create a function to call the Edge Function
CREATE OR REPLACE FUNCTION process_email_queue_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  function_url text;
  result json;
BEGIN
  -- Get the Supabase URL from environment or use default
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/process-email-queue';

  -- Call the Edge Function using http extension
  -- Note: This requires the http extension to be enabled
  SELECT content::json INTO result
  FROM http_post(
    function_url,
    '{}',
    'application/json'
  );

  -- Log the result
  RAISE NOTICE 'Email queue processing result: %', result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error processing email queue: %', SQLERRM;
END;
$$;

-- Schedule the cron job to run every 5 minutes
-- Syntax: cron.schedule(job_name, schedule, command)
-- Schedule format: minute hour day month weekday
SELECT cron.schedule(
  'process-email-queue',
  '*/5 * * * *', -- Every 5 minutes
  $$SELECT process_email_queue_cron();$$
);

-- Alternative: Schedule to run every 10 minutes
-- SELECT cron.schedule(
--   'process-email-queue',
--   '*/10 * * * *',
--   $$SELECT process_email_queue_cron();$$
-- );

-- View scheduled jobs
-- SELECT * FROM cron.job;

-- Unschedule a job (if needed)
-- SELECT cron.unschedule('process-email-queue');

COMMENT ON FUNCTION process_email_queue_cron() IS 'Cron job function to process pending emails in the queue every 5 minutes';
