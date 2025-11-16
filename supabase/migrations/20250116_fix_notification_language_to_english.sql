-- Fix notification language from Thai to English
-- Update all notification functions to use English

-- 1. Update notify_admins_new_booking function
CREATE OR REPLACE FUNCTION public.notify_admins_new_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  admin_record RECORD;
  customer_name TEXT;
  booking_time TEXT;
  booking_date_formatted TEXT;
BEGIN
  -- Get customer name
  SELECT full_name INTO customer_name FROM customers WHERE id = NEW.customer_id;

  -- Format booking time
  booking_time := substring(NEW.start_time::text, 1, 5) || ' - ' || substring(NEW.end_time::text, 1, 5);

  -- Format booking date
  booking_date_formatted := to_char(NEW.booking_date, 'DD Mon');

  -- Notify all admins
  FOR admin_record IN SELECT id FROM profiles WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, type, title, message, booking_id, team_id)
    VALUES (
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
$function$;

-- 2. Update notify_admins_booking_update function
CREATE OR REPLACE FUNCTION public.notify_admins_booking_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  admin_record RECORD;
  customer_name TEXT;
  booking_time TEXT;
  booking_date_formatted TEXT;
  status_text TEXT;
  status_emoji TEXT;
BEGIN
  -- Get customer name
  SELECT full_name INTO customer_name FROM customers WHERE id = NEW.customer_id;

  -- Format booking time
  booking_time := substring(NEW.start_time::text, 1, 5) || ' - ' || substring(NEW.end_time::text, 1, 5);

  -- Format booking date
  booking_date_formatted := to_char(NEW.booking_date, 'DD Mon');

  -- Handle cancellation
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    FOR admin_record IN SELECT id FROM profiles WHERE role = 'admin'
    LOOP
      INSERT INTO notifications (user_id, type, title, message, booking_id, team_id)
      VALUES (
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
      ELSE NEW.status
    END;

    status_emoji := CASE NEW.status
      WHEN 'confirmed' THEN '✅'
      WHEN 'in_progress' THEN '🔄'
      WHEN 'completed' THEN '✨'
      ELSE '📝'
    END;

    FOR admin_record IN SELECT id FROM profiles WHERE role = 'admin'
    LOOP
      INSERT INTO notifications (user_id, type, title, message, booking_id, team_id)
      VALUES (
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
$function$;

-- 3. Update notify_admins_new_customer function
CREATE OR REPLACE FUNCTION public.notify_admins_new_customer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  admin_record RECORD;
BEGIN
  -- Notify all admins about new customer
  FOR admin_record IN SELECT id FROM profiles WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, type, title, message, booking_id, team_id)
    VALUES (
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
$function$;

-- 4. Update notify_admins_new_team function
CREATE OR REPLACE FUNCTION public.notify_admins_new_team()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  admin_record RECORD;
BEGIN
  -- Notify all admins about new team
  FOR admin_record IN SELECT id FROM profiles WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, type, title, message, booking_id, team_id)
    VALUES (
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
$function$;

COMMENT ON FUNCTION public.notify_admins_new_booking() IS 'Notify admins when a new booking is created (English version)';
COMMENT ON FUNCTION public.notify_admins_booking_update() IS 'Notify admins when a booking is updated (English version)';
COMMENT ON FUNCTION public.notify_admins_new_customer() IS 'Notify admins when a new customer is created (English version)';
COMMENT ON FUNCTION public.notify_admins_new_team() IS 'Notify admins when a new team is created (English version)';
