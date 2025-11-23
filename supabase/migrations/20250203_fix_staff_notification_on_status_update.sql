-- Fix Staff Notification on Booking Status Update
-- Date: 2025-02-03
-- Issue: Staff และ Team Members ไม่ได้รับ notification เมื่อ booking status update
--        ตอนนี้ส่งเฉพาะ Admin/Manager เท่านั้น
-- Solution: แก้ไข trigger function ให้ส่ง notification ถึง Staff + Team Members ด้วย

-- ===================================================================
-- Step 1: Re-create the function with Staff + Team notification support
-- ===================================================================
CREATE OR REPLACE FUNCTION public.notify_admins_booking_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_name TEXT;
  booking_time TEXT;
  booking_date_formatted TEXT;
  status_text TEXT;
  status_emoji TEXT;
  v_user_ids UUID[];
  v_admin_ids UUID[];
  v_team_members UUID[];
  v_user_id UUID;
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
    -- สร้าง array เก็บ user_ids ที่ต้องได้รับ notification
    v_user_ids := ARRAY[]::UUID[];

    -- เพิ่ม Admin/Manager
    SELECT ARRAY_AGG(id) INTO v_admin_ids
    FROM profiles WHERE role IN ('admin', 'manager');

    IF v_admin_ids IS NOT NULL THEN
      v_user_ids := v_user_ids || v_admin_ids;
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
          'booking_cancelled',
          '❌ Booking Cancelled',
          customer_name || ' cancelled booking on ' || booking_date_formatted || ' at ' || booking_time,
          NEW.id,
          NEW.team_id
        );
      END LOOP;

      RAISE NOTICE 'Created cancellation notification for % users (booking_id: %)',
                   array_length(v_user_ids, 1), NEW.id;
    END IF;

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

    -- สร้าง array เก็บ user_ids ที่ต้องได้รับ notification
    v_user_ids := ARRAY[]::UUID[];

    -- เพิ่ม Admin/Manager
    SELECT ARRAY_AGG(id) INTO v_admin_ids
    FROM profiles WHERE role IN ('admin', 'manager');

    IF v_admin_ids IS NOT NULL THEN
      v_user_ids := v_user_ids || v_admin_ids;
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
          'booking_updated',
          status_emoji || ' Booking Status Updated',
          customer_name || ' - ' || booking_date_formatted || ' ' || booking_time || ' → ' || status_text,
          NEW.id,
          NEW.team_id
        );
      END LOOP;

      RAISE NOTICE 'Created status update notification for % users (booking_id: %, status: %)',
                   array_length(v_user_ids, 1), NEW.id, status_text;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ===================================================================
-- Step 2: Update function comment
-- ===================================================================
COMMENT ON FUNCTION public.notify_admins_booking_update() IS
  'Sends notifications to admins, managers, assigned staff, and team members when booking status changes. Includes booking_id. Prevents duplicates with DISTINCT.';

-- ===================================================================
-- Verification
-- ===================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Function updated: notify_admins_booking_update() now sends notifications to Staff + Team Members + Admin/Manager';
END $$;
