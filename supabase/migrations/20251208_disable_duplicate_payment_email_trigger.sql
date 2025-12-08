-- Disable the payment confirmation email trigger
--
-- ปัญหา: Email ถูกส่ง 2 ครั้งสำหรับ Recurring Bookings เพราะ:
-- 1. Trigger นี้ fire สำหรับทุก booking row ที่ payment_status เปลี่ยนเป็น 'paid'
-- 2. JavaScript service ก็เรียก sendPaymentConfirmationEmail() อีกครั้ง
--
-- Solution: ปิด trigger นี้ และให้ JavaScript service จัดการส่ง email แทน
-- เพราะ service สามารถ:
-- - ส่ง email 1 ครั้งต่อ payment action (ไม่ว่าจะมีกี่ bookings ใน recurring group)
-- - ใช้ recurring email template ที่แสดงรายการนัดหมายทั้งหมด
-- - ควบคุม logic ได้ดีกว่า (เช่น sendEmail=false option)

-- Drop the trigger (function จะยังอยู่เผื่อต้องการเปิดใช้งานใหม่)
DROP TRIGGER IF EXISTS trigger_send_payment_confirmation ON bookings;

-- Optional: Drop the function too if not needed
-- DROP FUNCTION IF EXISTS send_payment_confirmation_email();

-- Log
DO $$
BEGIN
  RAISE NOTICE 'Disabled payment confirmation email trigger to prevent duplicate emails';
END $$;
