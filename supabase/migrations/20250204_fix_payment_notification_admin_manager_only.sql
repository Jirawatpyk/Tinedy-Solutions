-- Fix Payment Notification - Admin and Manager Only
-- Date: 2025-02-04
-- Issue: Payment notifications ส่งไปถึง Staff ด้วย (ไม่ควรได้รับ) และ Manager ไม่ได้รับ (ควรได้รับ)
-- Solution: แก้ไข trigger function ให้ส่งเฉพาะ Admin และ Manager เท่านั้น

-- ===================================================================
-- Step 1: Re-create the function with Admin + Manager only
-- ===================================================================
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
  v_admin_manager_ids UUID[];
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

    -- เลือกเฉพาะ Admin และ Manager
    SELECT ARRAY_AGG(p.id)
    INTO v_admin_manager_ids
    FROM profiles p
    WHERE p.role IN ('admin', 'manager')
      AND p.id IS NOT NULL;

    -- ลบ duplicate user_ids
    v_admin_manager_ids := ARRAY(SELECT DISTINCT unnest(v_admin_manager_ids));

    -- สร้าง notification สำหรับ Admin และ Manager
    IF array_length(v_admin_manager_ids, 1) > 0 THEN
      FOREACH v_user_id IN ARRAY v_admin_manager_ids
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

      RAISE NOTICE 'Created payment notification for % admins/managers (booking_id: %, amount: %)',
                   array_length(v_admin_manager_ids, 1), NEW.id, payment_amount;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ===================================================================
-- Step 2: Update function comment
-- ===================================================================
COMMENT ON FUNCTION public.notify_payment_received() IS
  'Sends payment received notifications to admins and managers only when payment status changes to paid. Does not send to staff or team members.';

-- ===================================================================
-- Step 3: Drop old triggers and create new one (idempotent)
-- ===================================================================
-- ลบ trigger เก่าทั้งหมด (ป้องกัน notification ซ้ำ)
DROP TRIGGER IF EXISTS trigger_payment_notification ON bookings;
DROP TRIGGER IF EXISTS on_payment_received ON bookings;

-- สร้าง trigger ใหม่
CREATE TRIGGER on_payment_received
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION notify_payment_received();

-- ===================================================================
-- Verification
-- ===================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Payment notification trigger updated: Only Admin and Manager receive payment notifications';
  RAISE NOTICE '✅ Staff and Team Members will NOT receive payment notifications';
END $$;
