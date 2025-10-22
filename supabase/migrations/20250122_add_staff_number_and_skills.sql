-- Add staff_number and skills columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS staff_number VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS skills TEXT[];

-- Create index for staff_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_staff_number ON public.profiles(staff_number);

-- Create index for skills for better search performance
CREATE INDEX IF NOT EXISTS idx_profiles_skills ON public.profiles USING GIN(skills);

-- Add comments
COMMENT ON COLUMN public.profiles.staff_number IS 'Unique staff identification number (e.g., EMP001)';
COMMENT ON COLUMN public.profiles.skills IS 'Array of staff skills/specializations';

-- Function to auto-generate staff_number if not provided
CREATE OR REPLACE FUNCTION public.generate_staff_number()
RETURNS TRIGGER AS $$
DECLARE
    new_number INTEGER;
    new_staff_number VARCHAR(50);
BEGIN
    -- Only generate if staff_number is NULL and role is staff or admin
    IF NEW.staff_number IS NULL AND (NEW.role = 'staff' OR NEW.role = 'admin') THEN
        -- Get the highest existing staff number
        SELECT COALESCE(
            MAX(CAST(SUBSTRING(staff_number FROM 'STF(\d+)') AS INTEGER)),
            0
        ) INTO new_number
        FROM public.profiles
        WHERE staff_number IS NOT NULL
        AND staff_number ~ '^STF\d+$';

        -- Increment and format
        new_number := new_number + 1;
        new_staff_number := 'STF' || LPAD(new_number::TEXT, 4, '0');

        -- Assign the new staff number
        NEW.staff_number := new_staff_number;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate staff_number
DROP TRIGGER IF EXISTS trigger_generate_staff_number ON public.profiles;
CREATE TRIGGER trigger_generate_staff_number
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_staff_number();

-- Update existing staff records with auto-generated staff_numbers
DO $$
DECLARE
    rec RECORD;
    counter INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT id FROM public.profiles
        WHERE (role = 'staff' OR role = 'admin')
        AND staff_number IS NULL
        ORDER BY created_at
    LOOP
        counter := counter + 1;
        UPDATE public.profiles
        SET staff_number = 'STF' || LPAD(counter::TEXT, 4, '0')
        WHERE id = rec.id;
    END LOOP;
END $$;
