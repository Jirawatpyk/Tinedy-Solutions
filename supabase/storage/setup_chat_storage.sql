-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for chat-attachments bucket

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
