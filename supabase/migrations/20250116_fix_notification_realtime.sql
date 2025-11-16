-- Fix notification real-time updates
-- Ensure notifications table is properly configured for real-time

-- 1. Add notifications table to existing supabase_realtime publication (if not already added)
DO $$
BEGIN
  -- Try to add the table, ignore if it already exists
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION
  WHEN duplicate_object THEN
    -- Table already in publication, do nothing
    NULL;
END $$;

-- 2. Verify RLS policies are correct for realtime
-- Users should be able to see INSERT events for their own notifications

-- 3. Grant necessary permissions (if not already granted)
GRANT SELECT ON notifications TO authenticated;
GRANT INSERT ON notifications TO authenticated;
GRANT UPDATE ON notifications TO authenticated;
GRANT DELETE ON notifications TO authenticated;
