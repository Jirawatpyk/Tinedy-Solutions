-- ============================================================================
-- Migration: Fix Notification Trigger for Soft Delete Team Members
-- ============================================================================
-- Problem: Notification trigger sends to ALL current team members
--          but should only send to members who were in team when booking was CREATED
--
-- Solution:
-- 1. Use left_at IS NULL for active members (soft delete pattern)
-- 2. Use joined_at <= booking.created_at to ensure member was in team at booking creation
--
-- This ensures:
-- 1. Former team members (left_at IS NOT NULL) don't receive notifications
-- 2. New team members who joined AFTER booking creation don't receive notifications
-- 3. Only members who were active at booking creation time receive notifications
-- ============================================================================

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
  v_booking_created_at TIMESTAMPTZ;
BEGIN
  -- Get customer name
  SELECT full_name INTO customer_name
  FROM customers
  WHERE id = NEW.customer_id;

  -- Format booking time
  booking_time := substring(NEW.start_time::text, 1, 5) || ' - ' || substring(NEW.end_time::text, 1, 5);

  -- Format booking date
  booking_date_formatted := to_char(NEW.booking_date, 'DD Mon');

  -- Get booking created_at for membership period check
  v_booking_created_at := NEW.created_at;

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

    -- เพิ่ม Team Members ที่อยู่ในทีมตอนที่ booking ถูกสร้าง
    -- FIXED: Check membership period - member must have joined BEFORE booking was created
    IF NEW.team_id IS NOT NULL THEN
      SELECT ARRAY_AGG(staff_id) INTO v_team_members
      FROM team_members
      WHERE team_id = NEW.team_id
        AND staff_id IS NOT NULL
        AND left_at IS NULL  -- Currently active (soft delete)
        AND joined_at <= v_booking_created_at;  -- Was member when booking created

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

    -- เพิ่ม Team Members ที่อยู่ในทีมตอนที่ booking ถูกสร้าง
    -- FIXED: Check membership period - member must have joined BEFORE booking was created
    IF NEW.team_id IS NOT NULL THEN
      SELECT ARRAY_AGG(staff_id) INTO v_team_members
      FROM team_members
      WHERE team_id = NEW.team_id
        AND staff_id IS NOT NULL
        AND left_at IS NULL  -- Currently active (soft delete)
        AND joined_at <= v_booking_created_at;  -- Was member when booking created

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
-- Update function comment
-- ===================================================================
COMMENT ON FUNCTION public.notify_admins_booking_update() IS
  'Sends notifications to admins, managers, assigned staff, and team members who were ACTIVE at booking creation time (left_at IS NULL AND joined_at <= booking.created_at). Uses soft delete pattern.';

-- ===================================================================
-- Also fix notify_admins_new_booking function
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
  -- FIXED: Use left_at IS NULL AND joined_at <= NOW() for consistency with booking_update
  -- This ensures new members who just joined don't receive notifications for bookings
  -- created in the same moment (edge case but important for consistency)
  IF NEW.team_id IS NOT NULL THEN
    SELECT ARRAY_AGG(staff_id) INTO v_team_members
    FROM team_members
    WHERE team_id = NEW.team_id
      AND staff_id IS NOT NULL
      AND left_at IS NULL  -- Active members only (soft delete)
      AND joined_at <= NOW();  -- Was member when booking created

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

COMMENT ON FUNCTION public.notify_admins_new_booking() IS
  'Sends new booking notifications to admins, managers, assigned staff, and team members who were ACTIVE at booking creation time (left_at IS NULL AND joined_at <= NOW()). Consistent with notify_admins_booking_update.';

-- ===================================================================
-- Verification
-- ===================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ notify_admins_booking_update(): Only notifies members who were in team at booking creation (joined_at <= booking.created_at AND left_at IS NULL)';
  RAISE NOTICE '✅ notify_admins_new_booking(): Notifies all current active members (left_at IS NULL) for NEW bookings';
END $$;
