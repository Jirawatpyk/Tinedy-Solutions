-- Rollback: Staff Notification Fix
-- Date: 2025-02-03
-- Purpose: ย้อนกลับไปใช้ function เดิมที่ส่ง notification เฉพาะ Admin/Manager
-- Use this if: มีปัญหาหลังจาก apply migration 20250203_fix_staff_notification_on_status_update.sql

-- ===================================================================
-- Rollback to Original Function (Admin/Manager only)
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
-- Update function comment
-- ===================================================================
COMMENT ON FUNCTION public.notify_admins_booking_update() IS
  'Sends ONE notification to each admin/manager when booking status changes. Includes booking_id.';

-- ===================================================================
-- Verification
-- ===================================================================
DO $$
BEGIN
  RAISE NOTICE '⚠️ ROLLBACK: Function reverted to send notifications ONLY to Admin/Manager (Staff will NOT receive notifications)';
END $$;
