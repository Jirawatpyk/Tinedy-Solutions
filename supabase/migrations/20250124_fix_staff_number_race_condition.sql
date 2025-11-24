-- Fix staff_number race condition by using PostgreSQL SEQUENCE
-- This solves the issue where MAX() + 1 approach causes duplicate key violations
-- when multiple staff members are created concurrently

-- Step 1: Create a sequence for staff numbers
CREATE SEQUENCE IF NOT EXISTS staff_number_seq START WITH 1 INCREMENT BY 1;

-- Step 2: Sync the sequence with existing staff numbers
-- This ensures the sequence starts from the correct number
SELECT setval('staff_number_seq',
    COALESCE(
        (SELECT MAX(CAST(SUBSTRING(staff_number FROM 'STF(\d+)') AS INTEGER))
         FROM profiles
         WHERE staff_number ~ '^STF\d+$'),
        0
    )
);

-- Step 3: Update the trigger function to use SEQUENCE instead of MAX()
CREATE OR REPLACE FUNCTION public.generate_staff_number()
RETURNS TRIGGER AS $$
DECLARE
    new_number INTEGER;
BEGIN
    -- Only generate staff_number for staff/manager/admin roles if not provided
    IF NEW.staff_number IS NULL AND (NEW.role IN ('staff', 'manager', 'admin')) THEN
        -- Use nextval() for thread-safe sequential number generation
        new_number := nextval('staff_number_seq');

        -- Format as STF#### (4 digits with leading zeros)
        NEW.staff_number := 'STF' || LPAD(new_number::TEXT, 4, '0');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify the trigger still exists and is active
-- If not, recreate it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'generate_staff_number_trigger'
    ) THEN
        CREATE TRIGGER generate_staff_number_trigger
        BEFORE INSERT ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION public.generate_staff_number();
    END IF;
END $$;
