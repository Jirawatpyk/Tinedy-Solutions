-- Fix Foreign Key Constraints for User Deletion
-- Description: เปลี่ยน deleted_by foreign keys ให้เป็น ON DELETE SET NULL
-- เพื่อให้สามารถลบ user ที่เคย soft delete records ได้

-- 1. bookings.deleted_by
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_deleted_by_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_deleted_by_fkey
  FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. customers.deleted_by
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_deleted_by_fkey;
ALTER TABLE customers ADD CONSTRAINT customers_deleted_by_fkey
  FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. teams.deleted_by
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_deleted_by_fkey;
ALTER TABLE teams ADD CONSTRAINT teams_deleted_by_fkey
  FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- 4. service_packages.deleted_by
ALTER TABLE service_packages DROP CONSTRAINT IF EXISTS service_packages_deleted_by_fkey;
ALTER TABLE service_packages ADD CONSTRAINT service_packages_deleted_by_fkey
  FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- 5. service_packages_v2.deleted_by
ALTER TABLE service_packages_v2 DROP CONSTRAINT IF EXISTS service_packages_v2_deleted_by_fkey;
ALTER TABLE service_packages_v2 ADD CONSTRAINT service_packages_v2_deleted_by_fkey
  FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- 6. booking_status_history.changed_by (ถ้ามี)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_status_history') THEN
    ALTER TABLE booking_status_history DROP CONSTRAINT IF EXISTS booking_status_history_changed_by_fkey;
    ALTER TABLE booking_status_history ADD CONSTRAINT booking_status_history_changed_by_fkey
      FOREIGN KEY (changed_by) REFERENCES profiles(id) ON DELETE SET NULL;
    ALTER TABLE booking_status_history ALTER COLUMN changed_by DROP NOT NULL;
  END IF;
END $$;

-- 7. staff_availability.created_by (ถ้ามี)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_availability') THEN
    ALTER TABLE staff_availability DROP CONSTRAINT IF EXISTS staff_availability_created_by_fkey;
    ALTER TABLE staff_availability ADD CONSTRAINT staff_availability_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 8. settings.updated_by (ถ้ามี)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'updated_by') THEN
    ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_updated_by_fkey;
    ALTER TABLE settings ADD CONSTRAINT settings_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Verify: ตรวจสอบ foreign keys หลังแก้ไข
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'profiles'
  AND kcu.column_name IN ('deleted_by', 'changed_by', 'created_by', 'updated_by');
