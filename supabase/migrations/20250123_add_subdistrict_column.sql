-- Add subdistrict column to customers and bookings tables
-- This allows storing Thai address format: Province > District > Subdistrict > Zip Code

-- Add subdistrict to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS subdistrict TEXT;

-- Add subdistrict to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS subdistrict TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.customers.state IS 'Province (จังหวัด)';
COMMENT ON COLUMN public.customers.city IS 'District/Amphoe (อำเภอ)';
COMMENT ON COLUMN public.customers.subdistrict IS 'Subdistrict/Tambon (ตำบล)';
COMMENT ON COLUMN public.customers.zip_code IS 'Postal Code (รหัสไปรษณีย์)';

COMMENT ON COLUMN public.bookings.state IS 'Province (จังหวัด)';
COMMENT ON COLUMN public.bookings.city IS 'District/Amphoe (อำเภอ)';
COMMENT ON COLUMN public.bookings.subdistrict IS 'Subdistrict/Tambon (ตำบล)';
COMMENT ON COLUMN public.bookings.zip_code IS 'Postal Code (รหัสไปรษณีย์)';
