-- =====================================================
-- Chat System: Storage Policies for chat-attachments
-- =====================================================
-- Run this in Supabase SQL Editor to enable file uploads
-- =====================================================

-- DROP existing policies if they exist
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read all chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- 1. Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Allow authenticated users to read all chat files
CREATE POLICY "Users can read all chat files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-attachments');

-- 3. Allow users to update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Allow users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- Optional: Add attachments column to messages table
-- (Skip if you already have this column)
-- =====================================================

-- Check if column exists, add if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'messages'
    AND column_name = 'attachments'
  ) THEN
    ALTER TABLE messages
    ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;

    RAISE NOTICE 'Column "attachments" added to messages table';
  ELSE
    RAISE NOTICE 'Column "attachments" already exists';
  END IF;
END $$;

-- =====================================================
-- Done! Your chat system is ready for file uploads
-- =====================================================
