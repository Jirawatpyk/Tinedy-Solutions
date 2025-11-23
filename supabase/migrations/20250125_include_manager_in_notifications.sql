-- Include Manager role in notification functions
-- Date: 2025-01-25
-- Description: แก้ไข notification functions ให้ส่งการแจ้งเตือนไปยัง Manager role ด้วย (ไม่ใช่แค่ Admin)

-- ===================================================================
-- 1. notify_admins_new_booking() - แจ้งเตือน Admin และ Manager เมื่อมี booking ใหม่
-- ===================================================================
CREATE OR REPLACE FUNCTION public.notify_admins_new_booking()
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
BEGIN
  -- Get customer name
  SELECT full_name INTO customer_name
  FROM customers
  WHERE id = NEW.customer_id;

  -- Format booking time
  booking_time := substring(NEW.start_time::text, 1, 5) || ' - ' || substring(NEW.end_time::text, 1, 5);

  -- Format booking date
  booking_date_formatted := to_char(NEW.booking_date, 'DD Mon');

  -- Send notification to all admins AND managers
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
      'new_booking',
      '🔔 New Booking!',
      customer_name || ' booked on ' || booking_date_formatted || ' at ' || booking_time,
      NEW.id,
      NEW.team_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- ===================================================================
-- 2. notify_admins_booking_update() - แจ้งเตือน Admin และ Manager เมื่อ booking ถูกอัพเดท
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
-- 3. notify_admins_new_customer() - แจ้งเตือน Admin และ Manager เมื่อมีลูกค้าใหม่
-- ===================================================================
CREATE OR REPLACE FUNCTION public.notify_admins_new_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Send notification to all admins AND managers
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
      'new_customer',
      '👤 New Customer!',
      NEW.full_name || ' registered',
      NULL,
      NULL
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- ===================================================================
-- 4. notify_admins_new_team() - แจ้งเตือน Admin และ Manager เมื่อมีทีมใหม่
-- ===================================================================
CREATE OR REPLACE FUNCTION public.notify_admins_new_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Send notification to all admins AND managers
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
      'new_team',
      '👥 New Team!',
      'Team "' || NEW.name || '" was created',
      NULL,
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- ===================================================================
-- Comments for documentation
-- ===================================================================
COMMENT ON FUNCTION public.notify_admins_new_booking() IS
  'Sends notifications to all admins and managers when a new booking is created';

COMMENT ON FUNCTION public.notify_admins_booking_update() IS
  'Sends notifications to all admins and managers when a booking is updated or cancelled';

COMMENT ON FUNCTION public.notify_admins_new_customer() IS
  'Sends notifications to all admins and managers when a new customer is registered';

COMMENT ON FUNCTION public.notify_admins_new_team() IS
  'Sends notifications to all admins and managers when a new team is created';
