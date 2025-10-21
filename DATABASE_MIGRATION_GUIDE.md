# Database Migration Guide - File Attachments

**Required**: Run these SQL scripts in Supabase before using file attachment features

---

## Step 1: Open Supabase Dashboard

1. Go to https://supabase.com
2. Open your Tinedy CRM project
3. Navigate to **SQL Editor** (left sidebar)

---

## Step 2: Add Attachments Column

**Copy and run this SQL**:

```sql
-- Add attachments column to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add GIN index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_attachments
ON messages USING GIN (attachments);

-- Add comment
COMMENT ON COLUMN messages.attachments IS
'Array of attachment objects: [{ type, url, name, size, mimeType }]';
```

**Expected Result**: ✅ Success (no error)

---

## Step 3: Setup Storage Bucket

**Copy and run this SQL**:

```sql
-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;
```

**Expected Result**: ✅ Success or "already exists" (both OK)

---

## Step 4: Setup Storage RLS Policies

**Copy and run this SQL**:

```sql
-- Policy: Users can upload files to their own folder
CREATE POLICY "Users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view files they sent or received
CREATE POLICY "Users can view their chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  (
    -- User uploaded the file
    (storage.foldername(name))[1] = auth.uid()::text OR
    -- File is part of a message where user is sender or recipient
    EXISTS (
      SELECT 1 FROM messages
      WHERE (sender_id = auth.uid() OR recipient_id = auth.uid())
      AND attachments::text LIKE '%' || name || '%'
    )
  )
);

-- Policy: Users can delete their own uploads
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Expected Result**: ✅ Success (3 policies created)

---

## Step 5: Verify Migration

**Run this SQL to check**:

```sql
-- Check attachments column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'messages' AND column_name = 'attachments';

-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'chat-attachments';

-- Check policies exist
SELECT policyname
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage';
```

**Expected Results**:
- ✅ Column: `attachments | jsonb`
- ✅ Bucket: `chat-attachments | chat-attachments | false`
- ✅ Policies: 3 policies listed

---

## Troubleshooting

### Error: "column already exists"
**Solution**: Skip Step 2, column already added

### Error: "bucket already exists"
**Solution**: Skip Step 3, bucket already created

### Error: "policy already exists"
**Solution**: Good! Policies are in place

### Error: "permission denied"
**Solution**: Make sure you're logged in as database owner

---

## After Migration

1. ✅ Restart your dev server: `npm run dev`
2. ✅ Test file upload in chat
3. ✅ Verify images display correctly
4. ✅ Test file download

---

## Rollback (if needed)

```sql
-- Remove attachments column (WARNING: deletes all attachment data)
ALTER TABLE messages DROP COLUMN IF EXISTS attachments;

-- Remove storage bucket (WARNING: deletes all files)
DELETE FROM storage.objects WHERE bucket_id = 'chat-attachments';
DELETE FROM storage.buckets WHERE id = 'chat-attachments';

-- Remove policies
DROP POLICY IF EXISTS "Users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;
```

---

**Migration Complete!** 🎉

File attachments feature is now ready to use.
