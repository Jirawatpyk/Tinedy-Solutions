-- Add 'no_show' status to bookings table
-- Date: 2025-01-25
-- Description: เพิ่ม 'no_show' status สำหรับกรณีที่ลูกค้าไม่มาตามนัด

-- ตรวจสอบว่า status column มี constraint หรือไม่
-- ถ้ามี ให้ลบออกก่อน
DO $$
BEGIN
    -- ลบ constraint เดิม (ถ้ามี)
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'bookings' AND column_name = 'status'
    ) THEN
        ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
    END IF;

    -- เพิ่ม constraint ใหม่ที่รวม 'no_show'
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'));
END $$;

-- Add comment
COMMENT ON CONSTRAINT bookings_status_check ON bookings IS
  'Valid booking statuses: pending, confirmed, in_progress, completed, cancelled, no_show';
