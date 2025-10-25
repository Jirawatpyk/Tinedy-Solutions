-- =====================================================
-- Tinedy CRM: 1-Year Data Retention Policy
-- =====================================================
-- This will automatically delete messages older than 1 year (365 days)
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- Step 1: Create function to delete old messages
-- =====================================================

CREATE OR REPLACE FUNCTION delete_messages_older_than_1_year()
RETURNS TABLE(
  deleted_count INTEGER,
  oldest_remaining_date TIMESTAMPTZ
) AS $$
DECLARE
  v_deleted_count INTEGER;
  v_oldest_date TIMESTAMPTZ;
BEGIN
  -- Delete messages older than 1 year (365 days)
  DELETE FROM messages
  WHERE created_at < NOW() - INTERVAL '365 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Get oldest remaining message date
  SELECT MIN(created_at) INTO v_oldest_date
  FROM messages;

  -- Log the deletion
  RAISE NOTICE 'Deleted % messages older than 1 year. Oldest remaining message: %',
    v_deleted_count, v_oldest_date;

  RETURN QUERY SELECT v_deleted_count, v_oldest_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Step 2: Create cleanup trigger for attachments
-- =====================================================

-- When messages are deleted, log which files should be cleaned
CREATE TABLE IF NOT EXISTS files_to_cleanup (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_url TEXT NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION log_attachments_for_cleanup()
RETURNS TRIGGER AS $$
DECLARE
  attachment JSONB;
BEGIN
  -- Loop through attachments and log them for cleanup
  IF OLD.attachments IS NOT NULL AND jsonb_array_length(OLD.attachments) > 0 THEN
    FOR attachment IN SELECT * FROM jsonb_array_elements(OLD.attachments)
    LOOP
      INSERT INTO files_to_cleanup (file_url)
      VALUES (attachment->>'url')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS log_attachments_trigger ON messages;
CREATE TRIGGER log_attachments_trigger
  BEFORE DELETE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION log_attachments_for_cleanup();

-- =====================================================
-- Step 3: Enable pg_cron for automatic scheduling
-- =====================================================

-- First, enable the extension (only needs to be done once)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup to run every day at 3 AM
SELECT cron.schedule(
  'cleanup-old-messages',
  '0 3 * * *',  -- Run at 3:00 AM every day
  $$SELECT delete_messages_older_than_1_year();$$
);

-- =====================================================
-- Manual Commands (for testing)
-- =====================================================

-- Test: See how many messages would be deleted
SELECT COUNT(*) as messages_to_delete
FROM messages
WHERE created_at < NOW() - INTERVAL '365 days';

-- Test: Run cleanup manually
SELECT * FROM delete_messages_older_than_1_year();

-- Check scheduled jobs
SELECT * FROM cron.job WHERE jobname = 'cleanup-old-messages';

-- Unschedule (if needed)
-- SELECT cron.unschedule('cleanup-old-messages');

-- =====================================================
-- Step 4: Create admin view for monitoring
-- =====================================================

CREATE OR REPLACE VIEW message_retention_stats AS
SELECT
  COUNT(*) as total_messages,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as messages_last_30_days,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '90 days') as messages_last_90_days,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '365 days') as messages_last_1_year,
  MIN(created_at) as oldest_message,
  MAX(created_at) as newest_message,
  pg_size_pretty(pg_total_relation_size('messages')) as table_size
FROM messages;

-- View retention stats
SELECT * FROM message_retention_stats;

-- =====================================================
-- Step 5: Check files pending cleanup
-- =====================================================

-- View files that need to be deleted from Storage
SELECT
  COUNT(*) as files_to_cleanup,
  MIN(deleted_at) as oldest_file
FROM files_to_cleanup;

-- Get list of files to delete (for manual cleanup if needed)
SELECT file_url
FROM files_to_cleanup
ORDER BY deleted_at
LIMIT 100;

-- After manually deleting files from Storage, clean up the log:
-- DELETE FROM files_to_cleanup WHERE deleted_at < NOW() - INTERVAL '7 days';

-- =====================================================
-- Important Notes:
-- =====================================================
-- 1. pg_cron extension might not be available on Supabase Free tier
--    If you get an error, you'll need to run cleanup manually
--    or upgrade to Pro tier
--
-- 2. Files in Storage need to be deleted manually or via Edge Function
--    The trigger only logs which files need deletion
--
-- 3. Test the cleanup function first before scheduling:
--    SELECT * FROM delete_messages_older_than_1_year();
--
-- 4. Consider creating backups before first run
-- =====================================================
