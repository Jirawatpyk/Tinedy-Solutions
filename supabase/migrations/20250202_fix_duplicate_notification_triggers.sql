-- Fix Duplicate Notification Triggers
-- Date: 2025-02-02
-- Issue: Multiple triggers calling the same function cause duplicate notifications
-- Solution: Drop ALL old triggers and create only ONE new trigger

-- ===================================================================
-- Step 1: Drop ALL existing notification triggers on bookings table
-- ===================================================================
DROP TRIGGER IF EXISTS notify_admins_on_booking_update ON bookings;
DROP TRIGGER IF EXISTS trigger_notify_admins_booking_update ON bookings;
DROP TRIGGER IF EXISTS notify_booking_update ON bookings;
DROP TRIGGER IF EXISTS trigger_notify_booking_update ON bookings;

-- ===================================================================
-- Step 2: Re-create the function (ensure it's up to date)
-- ===================================================================
CREATE OR REPLACE FUNCTION public.notify_admins_booking_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  customer_name TEXT;
  booking_time TEXT;
  booking_date_formatted TEXT;
  status_text TEXT;
  status_emoji TEXT;
BEGIN
  -- Get customer name
  SELECT full_name INTO customer_name
  FROM customers
  WHERE id = NEW.customer_id;

  -- Format booking time
  booking_time := substring(NEW.start_time::text, 1, 5) || ' - ' || substring(NEW.end_time::text, 1, 5);

  -- Format booking date
  booking_date_formatted := to_char(NEW.booking_date, 'DD Mon');

  -- Handle cancellation
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    FOR admin_record IN SELECT id FROM profiles WHERE role IN ('admin', 'manager')
    LOOP
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        booking_id,
        team_id
      ) VALUES (
        admin_record.id,
        'booking_cancelled',
        '❌ Booking Cancelled',
        customer_name || ' cancelled booking on ' || booking_date_formatted || ' at ' || booking_time,
        NEW.id,
        NEW.team_id
      );
    END LOOP;

  -- Handle status updates (not cancelled)
  ELSIF OLD.status != NEW.status AND NEW.status != 'cancelled' THEN
    status_text := CASE NEW.status
      WHEN 'pending' THEN 'Pending'
      WHEN 'confirmed' THEN 'Confirmed'
      WHEN 'in_progress' THEN 'In Progress'
      WHEN 'completed' THEN 'Completed'
      WHEN 'no_show' THEN 'No Show'
      ELSE NEW.status
    END;

    status_emoji := CASE NEW.status
      WHEN 'confirmed' THEN '✅'
      WHEN 'in_progress' THEN '🔄'
      WHEN 'completed' THEN '✨'
      WHEN 'no_show' THEN '❌'
      ELSE '📝'
    END;

    FOR admin_record IN SELECT id FROM profiles WHERE role IN ('admin', 'manager')
    LOOP
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        booking_id,
        team_id
      ) VALUES (
        admin_record.id,
        'booking_updated',
        status_emoji || ' Booking Status Updated',
        customer_name || ' - ' || booking_date_formatted || ' ' || booking_time || ' → ' || status_text,
        NEW.id,
        NEW.team_id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- ===================================================================
-- Step 3: Create ONLY ONE trigger (no duplicates!)
-- ===================================================================
CREATE TRIGGER notify_admins_on_booking_update
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_admins_booking_update();

-- ===================================================================
-- Step 4: Verify - count triggers (should be exactly 1)
-- ===================================================================
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_proc p ON t.tgfoid = p.oid
  WHERE t.tgrelid = 'bookings'::regclass
    AND p.proname = 'notify_admins_booking_update';

  IF trigger_count != 1 THEN
    RAISE EXCEPTION 'Expected 1 trigger for notify_admins_booking_update, found %', trigger_count;
  END IF;

  RAISE NOTICE '✅ Success: Exactly 1 trigger found for notify_admins_booking_update';
END $$;

-- ===================================================================
-- Comments for documentation
-- ===================================================================
COMMENT ON FUNCTION public.notify_admins_booking_update() IS
  'Sends ONE notification to each admin/manager when booking status changes. Includes booking_id.';

COMMENT ON TRIGGER notify_admins_on_booking_update ON bookings IS
  'Single trigger for admin/manager notifications on booking status change (prevents duplicates)';
