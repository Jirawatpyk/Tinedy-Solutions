-- ===================================================================
-- Fix notify_admins_new_booking: show date range + safe end_time
--
-- Problems fixed:
-- 1. booking_date_formatted only showed start date (booking_date)
--    Multi-day bookings (e.g. 26–27 Feb) showed "26 Feb" only
-- 2. booking_time concat failed silently when end_time IS NULL
--    e.g. "10:00 - " or concatenation returned NULL
-- ===================================================================

CREATE OR REPLACE FUNCTION public.notify_admins_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_name TEXT;
  booking_date_formatted TEXT;
  booking_time TEXT;
  v_user_ids UUID[];
  v_admin_manager_ids UUID[];
  v_team_members UUID[];
  v_user_id UUID;
BEGIN
  -- Get customer name
  SELECT full_name INTO customer_name
  FROM customers
  WHERE id = NEW.customer_id;

  -- Format booking date: show range when end_date differs from booking_date
  booking_date_formatted := CASE
    WHEN NEW.end_date IS NOT NULL AND NEW.end_date <> NEW.booking_date THEN
      to_char(NEW.booking_date, 'DD Mon') || '–' || to_char(NEW.end_date, 'DD Mon')
    ELSE
      to_char(NEW.booking_date, 'DD Mon')
  END;

  -- Format booking time: omit end time when NULL (safe concat)
  booking_time := CASE
    WHEN NEW.end_time IS NOT NULL THEN
      substring(NEW.start_time::text, 1, 5) || '–' || substring(NEW.end_time::text, 1, 5)
    ELSE
      substring(NEW.start_time::text, 1, 5)
  END;

  -- Initialize array
  v_user_ids := ARRAY[]::UUID[];

  -- Add Admins and Managers
  SELECT ARRAY_AGG(id) INTO v_admin_manager_ids
  FROM profiles
  WHERE role IN ('admin', 'manager');

  IF v_admin_manager_ids IS NOT NULL THEN
    v_user_ids := v_user_ids || v_admin_manager_ids;
  END IF;

  -- Add assigned Staff (if any)
  IF NEW.staff_id IS NOT NULL THEN
    v_user_ids := v_user_ids || NEW.staff_id;
  END IF;

  -- Add active Team Members (if team_id set)
  IF NEW.team_id IS NOT NULL THEN
    SELECT ARRAY_AGG(staff_id) INTO v_team_members
    FROM team_members
    WHERE team_id = NEW.team_id
      AND staff_id IS NOT NULL
      AND left_at IS NULL
      AND joined_at <= NOW();

    IF v_team_members IS NOT NULL THEN
      v_user_ids := v_user_ids || v_team_members;
    END IF;
  END IF;

  -- Deduplicate user_ids
  v_user_ids := ARRAY(SELECT DISTINCT unnest(v_user_ids));

  -- Insert notification for each recipient
  IF array_length(v_user_ids, 1) > 0 THEN
    FOREACH v_user_id IN ARRAY v_user_ids
    LOOP
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        booking_id,
        team_id
      ) VALUES (
        v_user_id,
        'new_booking',
        '⚠️ New Booking!',
        customer_name || ' booked on ' || booking_date_formatted || ' at ' || booking_time,
        NEW.id,
        NEW.team_id
      );
    END LOOP;

    RAISE NOTICE 'Created new booking notification for % users (booking_id: %)',
                 array_length(v_user_ids, 1), NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_admins_new_booking() IS
  'Sends new booking notifications to admins, managers, assigned staff, and team members.
   Date range shown for multi-day bookings (e.g. "26–27 Feb").
   End time omitted when NULL (single-time bookings show "10:00" only).';

-- Verify
DO $$
BEGIN
  RAISE NOTICE '✅ notify_admins_new_booking(): Multi-day date range + NULL-safe end_time display';
END $$;
