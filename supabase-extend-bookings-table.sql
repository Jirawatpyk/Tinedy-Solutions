-- ============================================================
-- Extend Bookings Table for Service Packages V2
-- ============================================================
-- Adds new fields to support area-based tiered pricing
-- Safe to run: Uses IF NOT EXISTS to prevent errors

-- ============================================================
-- Add New Columns
-- ============================================================

-- Area in square meters (ตารางเมตร)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS area_sqm INTEGER;

-- Frequency: 1, 2, 4, or 8 times per month
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS frequency INTEGER DEFAULT 1;

-- Calculated price from tiered pricing
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS calculated_price DECIMAL(10, 2);

-- Reference to new service_packages_v2 table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS package_v2_id UUID REFERENCES service_packages_v2(id) ON DELETE SET NULL;

-- ============================================================
-- Add Constraints
-- ============================================================

-- Ensure frequency is valid (1, 2, 4, or 8)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_frequency_valid'
  ) THEN
    ALTER TABLE bookings
    ADD CONSTRAINT check_frequency_valid
    CHECK (frequency IN (1, 2, 4, 8));
  END IF;
END $$;

-- Ensure area is positive when provided
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_area_positive'
  ) THEN
    ALTER TABLE bookings
    ADD CONSTRAINT check_area_positive
    CHECK (area_sqm IS NULL OR area_sqm > 0);
  END IF;
END $$;

-- ============================================================
-- Add Indexes for Performance
-- ============================================================

-- Index on package_v2_id for joins
CREATE INDEX IF NOT EXISTS idx_bookings_package_v2_id
  ON bookings(package_v2_id);

-- Index on area_sqm for filtering/analysis
CREATE INDEX IF NOT EXISTS idx_bookings_area_sqm
  ON bookings(area_sqm) WHERE area_sqm IS NOT NULL;

-- Index on frequency for reporting
CREATE INDEX IF NOT EXISTS idx_bookings_frequency
  ON bookings(frequency) WHERE frequency IS NOT NULL;

-- Composite index for package queries
CREATE INDEX IF NOT EXISTS idx_bookings_package_both
  ON bookings(service_package_id, package_v2_id);

-- ============================================================
-- Add Comments for Documentation
-- ============================================================

COMMENT ON COLUMN bookings.area_sqm IS
  'Service area in square meters (ตารางเมตร) - used for tiered pricing calculation';

COMMENT ON COLUMN bookings.frequency IS
  'Booking frequency per month: 1 (once), 2 (twice), 4 (weekly), 8 (twice weekly)';

COMMENT ON COLUMN bookings.calculated_price IS
  'Automatically calculated price based on area + frequency (may differ from base price)';

COMMENT ON COLUMN bookings.package_v2_id IS
  'Reference to service_packages_v2 table (new tiered pricing model)';

-- ============================================================
-- Verification Queries
-- ============================================================

-- Verify new columns exist
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name IN ('area_sqm', 'frequency', 'calculated_price', 'package_v2_id')
ORDER BY column_name;

-- Verify constraints
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'bookings'::regclass
  AND conname LIKE 'check_%'
ORDER BY conname;

-- Verify indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'bookings'
  AND indexname LIKE 'idx_bookings_%'
ORDER BY indexname;

-- ============================================================
-- Success Message
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Bookings table successfully extended with tiered pricing fields';
  RAISE NOTICE '   - area_sqm column added';
  RAISE NOTICE '   - frequency column added (default: 1)';
  RAISE NOTICE '   - calculated_price column added';
  RAISE NOTICE '   - package_v2_id column added';
  RAISE NOTICE '   - Constraints and indexes created';
END $$;
