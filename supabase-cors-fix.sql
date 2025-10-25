-- =====================================================
-- Fix CORS for chat-attachments bucket
-- =====================================================
-- Run this in Supabase SQL Editor if you can't find CORS settings in UI
-- =====================================================

-- Update bucket to be public and allow CORS
UPDATE storage.buckets
SET
  public = true,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain']::text[],
  file_size_limit = 10485760  -- 10MB
WHERE id = 'chat-attachments';

-- =====================================================
-- Alternative: If you need to set CORS via API
-- =====================================================
-- Copy your Project URL and Service Role Key from Settings > API
-- Then run this curl command in terminal:

/*
curl -X PUT 'YOUR_PROJECT_URL/storage/v1/bucket/chat-attachments' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "public": true,
    "allowed_mime_types": ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"],
    "file_size_limit": 10485760
  }'
*/

-- =====================================================
-- Verify bucket settings
-- =====================================================
SELECT
  id,
  name,
  public,
  allowed_mime_types,
  file_size_limit
FROM storage.buckets
WHERE id = 'chat-attachments';
