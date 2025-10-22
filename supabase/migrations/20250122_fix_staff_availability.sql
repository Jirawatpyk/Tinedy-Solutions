-- Fix staff_availability table by dropping and recreating with correct column name
-- This migration fixes the "column date does not exist" error

-- Drop the existing table if it exists (CASCADE to drop dependent objects like policies)
DROP TABLE IF EXISTS public.staff_availability CASCADE;

-- Recreate the table with the correct column name (unavailable_date instead of date)
CREATE TABLE public.staff_availability (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    unavailable_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_available BOOLEAN DEFAULT false,
    reason TEXT, -- 'sick_leave', 'holiday', 'training', 'personal', 'other'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES public.profiles(id)
);

-- Create indexes for better query performance
CREATE INDEX idx_staff_availability_staff_id ON public.staff_availability(staff_id);
CREATE INDEX idx_staff_availability_date ON public.staff_availability(unavailable_date);
CREATE INDEX idx_staff_availability_staff_date ON public.staff_availability(staff_id, unavailable_date);

-- Enable Row Level Security
ALTER TABLE public.staff_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Staff can view their own availability records
CREATE POLICY "Staff can view their own availability"
    ON public.staff_availability
    FOR SELECT
    USING (auth.uid() = staff_id);

-- Staff can insert their own availability records
CREATE POLICY "Staff can insert their own availability"
    ON public.staff_availability
    FOR INSERT
    WITH CHECK (auth.uid() = staff_id);

-- Staff can update their own availability records
CREATE POLICY "Staff can update their own availability"
    ON public.staff_availability
    FOR UPDATE
    USING (auth.uid() = staff_id)
    WITH CHECK (auth.uid() = staff_id);

-- Staff can delete their own availability records
CREATE POLICY "Staff can delete their own availability"
    ON public.staff_availability
    FOR DELETE
    USING (auth.uid() = staff_id);

-- Admins have full access to all staff availability records
CREATE POLICY "Admins have full access to staff availability"
    ON public.staff_availability
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.staff_availability
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add table and column comments
COMMENT ON TABLE public.staff_availability IS 'Stores periods when staff are unavailable for bookings (holidays, sick leave, etc.)';
COMMENT ON COLUMN public.staff_availability.is_available IS 'false = unavailable, true = marking available during normally unavailable time';
COMMENT ON COLUMN public.staff_availability.reason IS 'Reason for unavailability: sick_leave, holiday, training, personal, other';
COMMENT ON COLUMN public.staff_availability.unavailable_date IS 'Date when staff is unavailable (renamed from date to avoid reserved keyword conflict)';
