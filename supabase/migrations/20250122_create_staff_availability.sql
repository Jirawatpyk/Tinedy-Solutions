-- Create staff_availability table for tracking when staff are unavailable
-- This table allows staff/admin to mark periods when staff cannot take bookings

CREATE TABLE IF NOT EXISTS public.staff_availability (
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
CREATE INDEX IF NOT EXISTS idx_staff_availability_staff_id ON public.staff_availability(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_availability_date ON public.staff_availability(unavailable_date);
CREATE INDEX IF NOT EXISTS idx_staff_availability_staff_date ON public.staff_availability(staff_id, unavailable_date);

-- Enable Row Level Security
ALTER TABLE public.staff_availability ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Staff can view their own availability" ON public.staff_availability;
DROP POLICY IF EXISTS "Staff can insert their own availability" ON public.staff_availability;
DROP POLICY IF EXISTS "Staff can update their own availability" ON public.staff_availability;
DROP POLICY IF EXISTS "Staff can delete their own availability" ON public.staff_availability;
DROP POLICY IF EXISTS "Admins have full access to staff availability" ON public.staff_availability;

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

DROP TRIGGER IF EXISTS set_updated_at ON public.staff_availability;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.staff_availability
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add some sample data for testing (optional - remove in production)
-- This helps test the availability checking functionality
COMMENT ON TABLE public.staff_availability IS 'Stores periods when staff are unavailable for bookings (holidays, sick leave, etc.)';
COMMENT ON COLUMN public.staff_availability.is_available IS 'false = unavailable, true = marking available during normally unavailable time';
COMMENT ON COLUMN public.staff_availability.reason IS 'Reason for unavailability: sick_leave, holiday, training, personal, other';
