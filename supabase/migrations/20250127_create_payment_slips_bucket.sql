-- Create storage bucket for payment slips
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-slips',
  'payment-slips',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- RLS Policies for payment-slips bucket

-- Allow anyone to upload payment slips (needed for customer payment page)
CREATE POLICY "Anyone can upload payment slips"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'payment-slips');

-- Allow anyone to view payment slips
CREATE POLICY "Anyone can view payment slips"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-slips');

-- Allow authenticated users to update payment slips
CREATE POLICY "Authenticated users can update payment slips"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-slips');

-- Allow service role and authenticated users to delete payment slips
CREATE POLICY "Authenticated users can delete payment slips"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-slips');
