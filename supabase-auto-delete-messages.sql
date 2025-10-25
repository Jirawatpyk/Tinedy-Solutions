-- =====================================================
-- Auto-delete old messages (Optional)
-- =====================================================
-- This will automatically delete messages older than X days
-- Only use if you need to comply with data retention policies
-- =====================================================

-- Option 1: Delete messages older than 90 days
-- (Run this manually when needed, or schedule with pg_cron)

DELETE FROM messages
WHERE created_at < NOW() - INTERVAL '90 days';

-- =====================================================
-- Option 2: Create a function to clean old messages
-- =====================================================

CREATE OR REPLACE FUNCTION delete_old_messages(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete old messages
  DELETE FROM messages
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Usage:
-- SELECT delete_old_messages(90);  -- Delete messages older than 90 days
-- SELECT delete_old_messages(30);  -- Delete messages older than 30 days

-- =====================================================
-- Option 3: Schedule automatic deletion (requires pg_cron extension)
-- =====================================================

-- Enable pg_cron extension (do this once)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule to run every day at 2 AM
-- SELECT cron.schedule(
--   'delete-old-messages',
--   '0 2 * * *',  -- Run at 2 AM every day
--   'SELECT delete_old_messages(90);'
-- );

-- To unschedule:
-- SELECT cron.unschedule('delete-old-messages');

-- =====================================================
-- Archive old messages instead of deleting
-- =====================================================

-- Create archive table
CREATE TABLE IF NOT EXISTS messages_archive (
  LIKE messages INCLUDING ALL
);

-- Function to archive old messages
CREATE OR REPLACE FUNCTION archive_old_messages(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Move old messages to archive
  INSERT INTO messages_archive
  SELECT * FROM messages
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;

  GET DIAGNOSTICS archived_count = ROW_COUNT;

  -- Delete from main table
  DELETE FROM messages
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;

  RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Usage:
-- SELECT archive_old_messages(90);
