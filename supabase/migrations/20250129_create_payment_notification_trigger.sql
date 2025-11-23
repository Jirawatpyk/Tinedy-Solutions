-- Database Trigger: สร้าง notification อัตโนมัติเมื่อ booking payment_status เปลี่ยนเป็น 'paid'
-- This trigger fires whenever payment_status changes to 'paid' (from any previous state)
-- and automatically creates notifications for staff, team members, and admins
-- For recurring bookings: creates ONE notification per group with total amount

-- Function: สร้าง notification เมื่อ payment_status เปลี่ยนเป็น 'paid'
CREATE OR REPLACE FUNCTION notify_payment_received()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name TEXT;
  v_amount DECIMAL;
  v_booking_count INT;
  v_total_amount DECIMAL;
  v_user_ids UUID[];
  v_staff_ids UUID[];
  v_admin_ids UUID[];
  v_user_id UUID;
  v_notification_message TEXT;
  v_is_first_in_group BOOLEAN;
BEGIN
  -- ✅ ตรวจสอบว่า payment_status เปลี่ยนจาก unpaid/pending_verification → 'paid'
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status
     AND NEW.payment_status = 'paid'
     AND OLD.payment_status IN ('unpaid', 'pending_verification') THEN

    -- ✅ ถ้าเป็น Recurring Booking Group → สร้าง notification เฉพาะ 1 ครั้ง
    IF NEW.recurring_group_id IS NOT NULL THEN
      -- ตรวจสอบว่า booking นี้เป็นตัวแรกในกลุ่มที่ถูก update หรือไม่
      -- (ใช้วิธีเช็คว่ามี notification สำหรับ recurring_group_id นี้แล้วหรือยัง)
      SELECT NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE type = 'payment_received'
          AND booking_id IN (
            SELECT id FROM bookings
            WHERE recurring_group_id = NEW.recurring_group_id
          )
      ) INTO v_is_first_in_group;

      -- ถ้ามี notification แล้ว → ข้ามไป (ไม่สร้างซ้ำ)
      IF NOT v_is_first_in_group THEN
        RETURN NEW;
      END IF;

      -- คำนวณ booking count และ total amount ของทั้งกลุ่ม
      SELECT COUNT(*), SUM(total_price)
      INTO v_booking_count, v_total_amount
      FROM bookings
      WHERE recurring_group_id = NEW.recurring_group_id;

      v_amount := v_total_amount;
    ELSE
      -- ✅ Single Booking → ใช้ amount ของ booking นี้
      v_booking_count := 1;
      v_amount := NEW.total_price;
    END IF;

    -- ดึงข้อมูล customer name
    SELECT c.full_name
    INTO v_customer_name
    FROM customers c
    WHERE c.id = NEW.customer_id;

    -- Default values
    v_customer_name := COALESCE(v_customer_name, 'Customer');
    v_amount := COALESCE(v_amount, 0);

    -- เริ่มต้น array สำหรับเก็บ user_ids
    v_user_ids := ARRAY[]::UUID[];

    -- ✅ กรณี Single Staff Booking
    IF NEW.staff_id IS NOT NULL THEN
      v_user_ids := v_user_ids || NEW.staff_id;

    -- ✅ กรณี Team Booking
    ELSIF NEW.team_id IS NOT NULL THEN
      -- ดึง staff_id ของทุกคนใน team
      SELECT ARRAY_AGG(tm.staff_id)
      INTO v_staff_ids
      FROM team_members tm
      WHERE tm.team_id = NEW.team_id
        AND tm.staff_id IS NOT NULL;

      IF v_staff_ids IS NOT NULL THEN
        v_user_ids := v_user_ids || v_staff_ids;
      END IF;
    END IF;

    -- ✅ เพิ่ม Admin users (role = 'admin')
    SELECT ARRAY_AGG(p.id)
    INTO v_admin_ids
    FROM profiles p
    WHERE p.role = 'admin'
      AND p.id IS NOT NULL;

    IF v_admin_ids IS NOT NULL THEN
      v_user_ids := v_user_ids || v_admin_ids;
    END IF;

    -- ✅ ลบ user_id ที่ซ้ำกัน (กรณี admin เป็น staff/team member ด้วย)
    v_user_ids := ARRAY(SELECT DISTINCT unnest(v_user_ids));

    -- ✅ สร้าง notification message (แสดงจำนวน bookings ถ้าเป็น recurring)
    IF v_booking_count > 1 THEN
      v_notification_message := 'Payment received from ' || v_customer_name ||
                                ' (฿' || v_amount::TEXT || ' for ' || v_booking_count || ' bookings)';
    ELSE
      v_notification_message := 'Payment received from ' || v_customer_name || ': ฿' || v_amount::TEXT;
    END IF;

    -- ✅ สร้าง notification สำหรับแต่ละ user
    IF array_length(v_user_ids, 1) > 0 THEN
      FOREACH v_user_id IN ARRAY v_user_ids
      LOOP
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          booking_id,
          team_id,
          is_read
        ) VALUES (
          v_user_id,
          'payment_received',
          '💰 Payment Received',
          v_notification_message,
          NEW.id,
          NEW.team_id,
          false
        );
      END LOOP;

      IF v_booking_count > 1 THEN
        RAISE NOTICE 'Created payment notification for % users (recurring group: %, % bookings, total: %)',
                     array_length(v_user_ids, 1), NEW.recurring_group_id, v_booking_count, v_amount;
      ELSE
        RAISE NOTICE 'Created payment notification for % users (booking_id: %)', array_length(v_user_ids, 1), NEW.id;
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger: เรียกใช้ function เมื่อมีการ UPDATE bookings
DROP TRIGGER IF EXISTS trigger_payment_notification ON bookings;
CREATE TRIGGER trigger_payment_notification
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_received();

COMMENT ON FUNCTION notify_payment_received() IS 'Automatically creates notifications when booking payment_status changes to paid';
COMMENT ON TRIGGER trigger_payment_notification ON bookings IS 'Triggers notification creation when payment is received';
