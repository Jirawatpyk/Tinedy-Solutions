-- Migration: Booking V2 — Multi-Day, Custom Pricing & Editable Times
-- Created: 2026-02-19
-- Story: S-01

-- Multi-day booking support + V2 pricing fields (S-01 + G2)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS job_name TEXT,
  ADD COLUMN IF NOT EXISTS custom_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS price_override BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_mode TEXT NOT NULL DEFAULT 'package'
    CHECK (price_mode IN ('package', 'override', 'custom'));

-- Constraint: end_date must be >= booking_date
ALTER TABLE bookings
  ADD CONSTRAINT chk_booking_date_range
  CHECK (end_date IS NULL OR end_date >= booking_date);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_bookings_end_date
  ON bookings(end_date) WHERE end_date IS NOT NULL;

-- RT5: Lightweight duplicate prevention (not full advisory lock)
-- Prevents exact same staff+date+time double-booking at DB level
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_no_duplicate
  ON bookings(staff_id, booking_date, start_time)
  WHERE deleted_at IS NULL AND staff_id IS NOT NULL;

-- ============================================================
-- Rollback SQL (run if migration needs to be reverted):
-- ============================================================
-- DROP INDEX IF EXISTS idx_bookings_no_duplicate;
-- DROP INDEX IF EXISTS idx_bookings_end_date;
-- ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_booking_date_range;
-- ALTER TABLE bookings
--   DROP COLUMN IF EXISTS end_date,
--   DROP COLUMN IF EXISTS job_name,
--   DROP COLUMN IF EXISTS custom_price,
--   DROP COLUMN IF EXISTS price_override;
-- ============================================================
-- Notes:
-- Run in Supabase Dashboard SQL Editor
-- RT1: Run during low-traffic window (recommended: 02:00-04:00 Thailand time)
-- Migration adds columns with DEFAULT — efficient but may cause brief lock on large tables
-- ============================================================
