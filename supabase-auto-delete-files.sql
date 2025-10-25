-- =====================================================
-- Auto-delete old files from Storage (Optional)
-- =====================================================
-- This will delete files that are no longer referenced in messages
-- =====================================================

-- Function to delete orphaned files
CREATE OR REPLACE FUNCTION delete_orphaned_files()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  file_record RECORD;
BEGIN
  -- Note: This is a simplified version
  -- You'll need to implement the actual file deletion via Supabase Storage API
  -- This just shows the concept

  -- Find attachments in messages
  -- Compare with files in storage
  -- Delete files not referenced anywhere

  RAISE NOTICE 'Orphaned file cleanup completed. Files deleted: %', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Better approach: Clean files when deleting messages
-- =====================================================

-- Create a function to clean up files when messages are deleted
CREATE OR REPLACE FUNCTION cleanup_message_attachments()
RETURNS TRIGGER AS $$
BEGIN
  -- When a message is deleted, we should also delete its attachments from storage
  -- This would need to be implemented via Edge Functions or application code
  -- because we can't directly call Storage API from SQL

  RAISE NOTICE 'Message deleted: %. Attachments should be cleaned up.', OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS message_cleanup_trigger ON messages;
CREATE TRIGGER message_cleanup_trigger
  AFTER DELETE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_message_attachments();

-- =====================================================
-- Recommended: Keep files for legal/audit purposes
-- =====================================================
-- For businesses, it's often better to:
-- 1. Keep all files for at least 1-2 years
-- 2. Archive old files to cheaper storage (Supabase Archive tier)
-- 3. Only delete after legal retention period expires
