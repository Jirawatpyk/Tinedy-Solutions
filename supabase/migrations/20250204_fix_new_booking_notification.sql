-- Fix New Booking Notification - Send to Admin, Manager, Staff, and Team Members
-- Date: 2025-02-04
-- Issue: Staff ไม่ได้รับ "New Booking!" notification เพราะ:
--        1. ไม่มี trigger สำหรับ AFTER INSERT ON bookings
--        2. Function เดิมส่งเฉพาะ Admin + Manager (ไม่รวม Staff + Team Members)
-- Solution: อัพเดท function และสร้าง trigger

-- ===================================================================
-- Step 1: Re-create function with Staff + Team Members support
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

  -- Format booking date and time
  booking_date_formatted := to_char(NEW.booking_date, 'DD Mon');
  booking_time := substring(NEW.start_time::text, 1, 5) || ' - ' || substring(NEW.end_time::text, 1, 5);

  -- Initialize array
  v_user_ids := ARRAY[]::UUID[];

  -- เพิ่ม Admin และ Manager
  SELECT ARRAY_AGG(id) INTO v_admin_manager_ids
  FROM profiles
  WHERE role IN ('admin', 'manager');

  IF v_admin_manager_ids IS NOT NULL THEN
    v_user_ids := v_user_ids || v_admin_manager_ids;
  END IF;

  -- เพิ่ม Staff ที่ถูก assign (ถ้ามี)
  IF NEW.staff_id IS NOT NULL THEN
    v_user_ids := v_user_ids || NEW.staff_id;
  END IF;

  -- เพิ่ม Team Members (ถ้ามี team_id)
  IF NEW.team_id IS NOT NULL THEN
    SELECT ARRAY_AGG(staff_id) INTO v_team_members
    FROM team_members
    WHERE team_id = NEW.team_id
      AND staff_id IS NOT NULL
      AND is_active = true;

    IF v_team_members IS NOT NULL THEN
      v_user_ids := v_user_ids || v_team_members;
    END IF;
  END IF;

  -- ลบ duplicate user_ids (กรณี admin เป็น staff/team member ด้วย)
  v_user_ids := ARRAY(SELECT DISTINCT unnest(v_user_ids));

  -- สร้าง notification สำหรับทุกคน
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

-- ===================================================================
-- Step 2: Update function comment
-- ===================================================================
COMMENT ON FUNCTION public.notify_admins_new_booking() IS
  'Sends new booking notifications to admins, managers, assigned staff, and team members when a new booking is created.';

-- ===================================================================
-- Step 3: Create trigger for AFTER INSERT
-- ===================================================================
DROP TRIGGER IF EXISTS notify_admins_on_new_booking ON bookings;

CREATE TRIGGER notify_admins_on_new_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_booking();

-- ===================================================================
-- Verification
-- ===================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ New booking notification trigger created: Admin, Manager, Staff, and Team Members will receive notifications';
  RAISE NOTICE '✅ Trigger fires on AFTER INSERT ON bookings';
END $$;
