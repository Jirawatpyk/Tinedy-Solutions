-- EMERGENCY COMPLETE ROLLBACK - Restore Login Functionality
-- Date: 2025-02-04
-- Issue: Login completely broken after deploying new booking notification
-- Solution: Rollback ALL changes made today in reverse order

-- ===================================================================
-- Step 1: Drop ALL triggers and functions created today
-- ===================================================================

-- Drop new booking notification (the problematic one)
DROP TRIGGER IF EXISTS notify_admins_on_new_booking ON bookings;
DROP FUNCTION IF EXISTS public.notify_admins_new_booking() CASCADE;

-- Drop payment notification trigger (revert to old version)
DROP TRIGGER IF EXISTS on_payment_received ON bookings;
DROP FUNCTION IF EXISTS public.notify_payment_received() CASCADE;

-- ===================================================================
-- Step 2: Restore original payment notification function
-- ===================================================================
-- This is the ORIGINAL working version before today's changes
CREATE OR REPLACE FUNCTION public.notify_payment_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_name TEXT;
  booking_date_formatted TEXT;
  booking_time TEXT;
  payment_amount NUMERIC;
  v_admin_ids UUID[];
  v_staff_and_team_ids UUID[];
  v_user_id UUID;
BEGIN
  -- ส่งเฉพาะเมื่อ payment status เปลี่ยนเป็น 'paid'
  IF OLD.payment_status != 'paid' AND NEW.payment_status = 'paid' THEN
    -- Get customer name
    SELECT full_name INTO customer_name
    FROM customers
    WHERE id = NEW.customer_id;

    -- Format booking date and time
    booking_date_formatted := to_char(NEW.booking_date, 'DD Mon');
    booking_time := substring(NEW.start_time::text, 1, 5) || ' - ' || substring(NEW.end_time::text, 1, 5);

    -- Get payment amount
    payment_amount := NEW.total_price;

    -- Get admin IDs
    SELECT ARRAY_AGG(p.id)
    INTO v_admin_ids
    FROM profiles p
    WHERE p.role = 'admin'
      AND p.id IS NOT NULL;

    -- Get staff and team member IDs
    IF NEW.staff_id IS NOT NULL THEN
      v_staff_and_team_ids := ARRAY[NEW.staff_id];
    ELSE
      v_staff_and_team_ids := ARRAY[]::UUID[];
    END IF;

    -- Add team members if team_id exists
    IF NEW.team_id IS NOT NULL THEN
      SELECT ARRAY_AGG(tm.staff_id)
      INTO v_staff_and_team_ids
      FROM team_members tm
      WHERE tm.team_id = NEW.team_id
        AND tm.staff_id IS NOT NULL
        AND tm.is_active = true;
    END IF;

    -- Create notifications for admins
    IF array_length(v_admin_ids, 1) > 0 THEN
      FOREACH v_user_id IN ARRAY v_admin_ids
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
          'payment_received',
          '💰 Payment Received',
          customer_name || ' paid ฿' || payment_amount::text || ' for ' || booking_date_formatted || ' ' || booking_time,
          NEW.id,
          NEW.team_id
        );
      END LOOP;
    END IF;

    -- Create notifications for staff and team members
    IF array_length(v_staff_and_team_ids, 1) > 0 THEN
      FOREACH v_user_id IN ARRAY v_staff_and_team_ids
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
          'payment_received',
          '💰 Payment Received',
          customer_name || ' paid ฿' || payment_amount::text || ' for ' || booking_date_formatted || ' ' || booking_time,
          NEW.id,
          NEW.team_id
        );
      END LOOP;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Recreate original trigger
CREATE TRIGGER trigger_payment_notification
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION notify_payment_received();

-- ===================================================================
-- Verification
-- ===================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ EMERGENCY ROLLBACK COMPLETE';
  RAISE NOTICE '✅ Removed problematic new booking notification';
  RAISE NOTICE '✅ Restored original payment notification';
  RAISE NOTICE '⚠️ Login should work now - please test immediately';
  RAISE NOTICE '⚠️ New booking notifications are DISABLED (will fix later)';
END $$;
