-- Add business_logo_url column to settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS business_logo_url TEXT;

-- Add comment to the column
COMMENT ON COLUMN settings.business_logo_url IS 'URL of the business logo stored in Supabase Storage (business-logos bucket). This logo will be displayed in customer emails.';

-- Create storage bucket for business logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for business-logos bucket

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload business logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business-logos');

-- Allow authenticated users to update logos
CREATE POLICY "Authenticated users can update business logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'business-logos');

-- Allow authenticated users to delete logos
CREATE POLICY "Authenticated users can delete business logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'business-logos');

-- Allow public read access to logos (needed for emails)
CREATE POLICY "Public can view business logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-logos');
