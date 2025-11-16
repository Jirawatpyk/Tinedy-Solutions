-- ============================================================
-- Migration: Add Recurring Bookings Support
-- Version: 1.0.0
-- Date: 2025-01-12
-- Description: เพิ่มฟิลด์สำหรับรองรับ Recurring Bookings
-- ============================================================

-- เพิ่มฟิลด์สำหรับ Recurring Bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS recurring_group_id UUID,
ADD COLUMN IF NOT EXISTS recurring_sequence INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurring_total INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurring_pattern TEXT,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- Comments สำหรับอธิบายฟิลด์
COMMENT ON COLUMN bookings.recurring_group_id IS
  'UUID เดียวกันสำหรับ bookings ทั้งหมดในกลุ่ม recurring เดียวกัน';
COMMENT ON COLUMN bookings.recurring_sequence IS
  'ลำดับที่ของ booking นี้ในกลุ่ม (1-based index)';
COMMENT ON COLUMN bookings.recurring_total IS
  'จำนวน bookings ทั้งหมดในกลุ่ม recurring นี้';
COMMENT ON COLUMN bookings.recurring_pattern IS
  'รูปแบบการเกิดซ้ำ: "auto-weekly", "auto-biweekly", "auto-twice", "custom"';
COMMENT ON COLUMN bookings.is_recurring IS
  'Flag บอกว่า booking นี้เป็นส่วนหนึ่งของ recurring group';
COMMENT ON COLUMN bookings.parent_booking_id IS
  'Reference ไปยัง booking แรกในกลุ่ม (optional)';

-- เพิ่ม constraints
ALTER TABLE bookings
ADD CONSTRAINT check_recurring_sequence_positive
  CHECK (recurring_sequence > 0),
ADD CONSTRAINT check_recurring_total_positive
  CHECK (recurring_total > 0),
ADD CONSTRAINT check_sequence_not_exceed_total
  CHECK (recurring_sequence <= recurring_total);

-- เพิ่ม indexes เพื่อ performance
CREATE INDEX IF NOT EXISTS idx_bookings_recurring_group_id
  ON bookings(recurring_group_id) WHERE recurring_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_is_recurring
  ON bookings(is_recurring) WHERE is_recurring = TRUE;
CREATE INDEX IF NOT EXISTS idx_bookings_parent_booking_id
  ON bookings(parent_booking_id) WHERE parent_booking_id IS NOT NULL;

-- Composite index สำหรับ query bookings ในกลุ่มเดียวกันเรียงตามลำดับ
CREATE INDEX IF NOT EXISTS idx_bookings_recurring_group_sequence
  ON bookings(recurring_group_id, recurring_sequence)
  WHERE recurring_group_id IS NOT NULL;

-- ============================================================
-- Helper Functions
-- ============================================================

-- ฟังก์ชันสำหรับนับจำนวน bookings ในกลุ่ม
CREATE OR REPLACE FUNCTION get_recurring_group_count(group_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM bookings
  WHERE recurring_group_id = group_id;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_recurring_group_count(UUID) IS
  'นับจำนวน bookings ทั้งหมดในกลุ่ม recurring';

-- ฟังก์ชันตรวจสอบว่า booking นี้เป็นตัวแรกในกลุ่มหรือไม่
CREATE OR REPLACE FUNCTION is_first_in_group(booking_id UUID)
RETURNS BOOLEAN AS $$
  SELECT recurring_sequence = 1
  FROM bookings
  WHERE id = booking_id;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION is_first_in_group(UUID) IS
  'ตรวจสอบว่า booking นี้เป็นตัวแรก (sequence = 1) ในกลุ่มหรือไม่';

-- ฟังก์ชันดึง bookings ทั้งหมดในกลุ่ม
CREATE OR REPLACE FUNCTION get_recurring_group_bookings(group_id UUID)
RETURNS TABLE (
  id UUID,
  booking_date DATE,
  start_time TIME,
  status TEXT,
  recurring_sequence INTEGER
) AS $$
  SELECT id, booking_date::DATE, start_time::TIME, status, recurring_sequence
  FROM bookings
  WHERE recurring_group_id = group_id
  ORDER BY recurring_sequence;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_recurring_group_bookings(UUID) IS
  'ดึง bookings ทั้งหมดในกลุ่ม recurring เรียงตามลำดับ sequence';
