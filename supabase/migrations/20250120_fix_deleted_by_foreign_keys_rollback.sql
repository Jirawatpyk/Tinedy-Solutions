-- Rollback: Fix Foreign Key Constraints for User Deletion
-- Description: เปลี่ยน deleted_by foreign keys กลับเป็น ON DELETE RESTRICT (default)
-- ใช้เมื่อต้องการ rollback migration 20250120_fix_deleted_by_foreign_keys.sql

-- 1. bookings.deleted_by
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_deleted_by_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_deleted_by_fkey
  FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE RESTRICT;

-- 2. customers.deleted_by
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_deleted_by_fkey;
ALTER TABLE customers ADD CONSTRAINT customers_deleted_by_fkey
  FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE RESTRICT;

-- 3. teams.deleted_by
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_deleted_by_fkey;
ALTER TABLE teams ADD CONSTRAINT teams_deleted_by_fkey
  FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE RESTRICT;

-- 4. service_packages.deleted_by
ALTER TABLE service_packages DROP CONSTRAINT IF EXISTS service_packages_deleted_by_fkey;
ALTER TABLE service_packages ADD CONSTRAINT service_packages_deleted_by_fkey
  FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE RESTRICT;

-- 5. service_packages_v2.deleted_by
ALTER TABLE service_packages_v2 DROP CONSTRAINT IF EXISTS service_packages_v2_deleted_by_fkey;
ALTER TABLE service_packages_v2 ADD CONSTRAINT service_packages_v2_deleted_by_fkey
  FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE RESTRICT;

-- 6. booking_status_history.changed_by (ถ้ามี)
-- หมายเหตุ: ถ้า migration เดิมทำให้ changed_by เป็น nullable แล้ว
-- การ rollback ไม่สามารถ revert กลับเป็น NOT NULL ได้ถ้ามี NULL values อยู่
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_status_history') THEN
    ALTER TABLE booking_status_history DROP CONSTRAINT IF EXISTS booking_status_history_changed_by_fkey;
    ALTER TABLE booking_status_history ADD CONSTRAINT booking_status_history_changed_by_fkey
      FOREIGN KEY (changed_by) REFERENCES profiles(id) ON DELETE RESTRICT;

    -- ถ้าต้องการ revert NOT NULL constraint ให้ uncomment ด้านล่าง
    -- แต่ต้องมั่นใจว่าไม่มี NULL values ก่อน
    -- ALTER TABLE booking_status_history ALTER COLUMN changed_by SET NOT NULL;
  END IF;
END $$;

-- 7. messages.sender_id (ถ้ามี)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'sender_id'
  ) THEN
    ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
    ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey
      FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 8. notifications.user_id (ถ้ามี)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
    ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- =====================================================
-- คำเตือน: หลัง rollback แล้ว
-- การลบ user ที่เคย soft delete records จะ ERROR อีกครั้ง
-- =====================================================
