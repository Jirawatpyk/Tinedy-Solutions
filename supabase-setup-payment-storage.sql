-- ============================================
-- Supabase Storage Setup for Payment Slips
-- ============================================
-- Run this in Supabase SQL Editor

-- 1. Create storage bucket for payment slips
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-slips', 'payment-slips', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up storage policies for payment slips bucket

-- Allow anyone to upload payment slips (public upload)
CREATE POLICY "Allow public upload of payment slips"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'payment-slips');

-- Allow public to view payment slips
CREATE POLICY "Allow public read of payment slips"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-slips');

-- Allow authenticated users (admin/staff) to delete slips
CREATE POLICY "Allow authenticated delete of payment slips"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-slips');

-- ============================================
-- Add payment_slip_url column to bookings table
-- ============================================

-- Add column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings'
        AND column_name = 'payment_slip_url'
    ) THEN
        ALTER TABLE bookings
        ADD COLUMN payment_slip_url TEXT;
    END IF;
END $$;

-- ============================================
-- Add payment_status enum value for pending_verification
-- ============================================

-- This adds 'pending_verification' to payment_status if not exists
-- Note: You may need to manually add this via Supabase UI if enum exists
-- Go to: Table Editor > bookings > payment_status column > Edit > Add enum value

-- ============================================
-- INSTRUCTIONS:
-- ============================================
-- 1. Go to Supabase Dashboard
-- 2. Select your project
-- 3. Go to SQL Editor
-- 4. Create new query
-- 5. Paste this entire file
-- 6. Click "Run"
-- 7. Verify:
--    - Storage > Buckets > Should see "payment-slips" bucket
--    - Storage > Policies > Should see 3 policies
--    - Table Editor > bookings > Should have payment_slip_url column
-- ============================================
