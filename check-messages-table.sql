-- =====================================================
-- Check messages table structure
-- =====================================================
-- Run this in Supabase SQL Editor to check your table
-- =====================================================

-- 1. Check if 'attachments' column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- 2. Check a sample message to see if attachments are stored
SELECT id, message, attachments, created_at
FROM messages
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- If 'attachments' column doesn't exist, add it:
-- =====================================================
-- ALTER TABLE messages
-- ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
