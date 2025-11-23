-- Fix staff_number generation to include manager role
CREATE OR REPLACE FUNCTION public.generate_staff_number()
RETURNS TRIGGER AS $$
DECLARE
    new_number INTEGER;
    new_staff_number VARCHAR(50);
BEGIN
    -- Only generate if staff_number is NULL and role is staff, manager, or admin
    IF NEW.staff_number IS NULL AND (NEW.role = 'staff' OR NEW.role = 'manager' OR NEW.role = 'admin') THEN
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

-- Update existing manager records without staff_number
DO $$
DECLARE
    rec RECORD;
    counter INTEGER;
BEGIN
    -- Get current max staff number
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(staff_number FROM 'STF(\d+)') AS INTEGER)),
        0
    ) INTO counter
    FROM public.profiles
    WHERE staff_number IS NOT NULL
    AND staff_number ~ '^STF\d+$';

    -- Update managers without staff_number
    FOR rec IN
        SELECT id FROM public.profiles
        WHERE role = 'manager'
        AND staff_number IS NULL
        ORDER BY created_at
    LOOP
        counter := counter + 1;
        UPDATE public.profiles
        SET staff_number = 'STF' || LPAD(counter::TEXT, 4, '0')
        WHERE id = rec.id;
    END LOOP;
END $$;
