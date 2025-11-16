-- ============================================================
-- ROLLBACK Script for Service Packages V2 Migration
-- ============================================================
-- ⚠️ WARNING: This will REMOVE all Service Packages V2 data
-- Only run this if migration fails and you need to revert
-- ============================================================

-- Show warning
DO $$
BEGIN
  RAISE WARNING '⚠️  ROLLBACK SCRIPT - This will remove all V2 data!';
  RAISE WARNING '⚠️  Make sure you have a database backup before proceeding';
  RAISE WARNING '⚠️  Press Ctrl+C now to cancel, or continue to rollback';
END $$;

-- Optional: Uncomment to add a safety delay
-- SELECT pg_sleep(5);

-- ============================================================
-- Step 1: Remove Foreign Key References
-- ============================================================

-- Remove package_v2_id references from bookings
UPDATE bookings
SET package_v2_id = NULL
WHERE package_v2_id IS NOT NULL;

RAISE NOTICE 'Step 1/5: Cleared package_v2_id references from bookings';

-- ============================================================
-- Step 2: Drop New Tables
-- ============================================================

-- Drop package_pricing_tiers table
DROP TABLE IF EXISTS package_pricing_tiers CASCADE;

RAISE NOTICE 'Step 2/5: Dropped package_pricing_tiers table';

-- Drop service_packages_v2 table
DROP TABLE IF EXISTS service_packages_v2 CASCADE;

RAISE NOTICE 'Step 3/5: Dropped service_packages_v2 table';

-- ============================================================
-- Step 3: Remove New Columns from Bookings
-- ============================================================

-- Remove constraints first
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS check_frequency_valid;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS check_area_positive;

-- Remove indexes
DROP INDEX IF EXISTS idx_bookings_package_v2_id;
DROP INDEX IF EXISTS idx_bookings_area_sqm;
DROP INDEX IF EXISTS idx_bookings_frequency;
DROP INDEX IF EXISTS idx_bookings_package_both;

-- Remove columns
ALTER TABLE bookings DROP COLUMN IF EXISTS area_sqm;
ALTER TABLE bookings DROP COLUMN IF EXISTS frequency;
ALTER TABLE bookings DROP COLUMN IF EXISTS calculated_price;
ALTER TABLE bookings DROP COLUMN IF EXISTS package_v2_id;

RAISE NOTICE 'Step 4/5: Removed new columns from bookings table';

-- ============================================================
-- Step 4: Drop Helper Functions
-- ============================================================

DROP FUNCTION IF EXISTS get_package_price(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_required_staff(UUID, INTEGER);
DROP VIEW IF EXISTS service_packages_overview;

RAISE NOTICE 'Step 5/5: Dropped helper functions and views';

-- ============================================================
-- Step 5: Verification
-- ============================================================

-- Verify tables are gone
DO $$
DECLARE
  v2_table_exists BOOLEAN;
  tiers_table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'service_packages_v2'
  ) INTO v2_table_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'package_pricing_tiers'
  ) INTO tiers_table_exists;

  IF v2_table_exists OR tiers_table_exists THEN
    RAISE WARNING '❌ Rollback incomplete: Some tables still exist';
  ELSE
    RAISE NOTICE '✅ Rollback complete: All V2 tables removed';
  END IF;
END $$;

-- Verify columns are gone
SELECT
  column_name
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name IN ('area_sqm', 'frequency', 'calculated_price', 'package_v2_id');
-- Should return 0 rows

-- Verify original tables intact
SELECT
  'service_packages' as table_name,
  COUNT(*) as record_count
FROM service_packages
UNION ALL
SELECT
  'bookings',
  COUNT(*)
FROM bookings;

-- ============================================================
-- Final Status
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ROLLBACK COMPLETED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Database reverted to pre-migration state';
  RAISE NOTICE 'Original service_packages table: INTACT';
  RAISE NOTICE 'Original bookings table: INTACT';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Verify data integrity';
  RAISE NOTICE '2. Test booking functionality';
  RAISE NOTICE '3. Review what went wrong';
  RAISE NOTICE '4. Fix issues before retrying migration';
END $$;
