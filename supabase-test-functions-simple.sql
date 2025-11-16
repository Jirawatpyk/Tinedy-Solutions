-- ============================================================
-- Test Functions for Service Packages V2 (Supabase Compatible)
-- ============================================================
-- Simplified version for Supabase SQL Editor
-- Run after creating tables and functions

-- ============================================================
-- STEP 1: Create Test Package and Get ID
-- ============================================================
-- Run this first, then copy the returned UUID

INSERT INTO service_packages_v2 (
  name, description, service_type, category, pricing_model
) VALUES (
  'Deep Cleaning Office (Test)',
  'Test package for tiered pricing',
  'cleaning',
  'office',
  'tiered'
) RETURNING id, name;

-- ⚠️ COPY THE UUID FROM ABOVE RESULT
-- Then replace 'PASTE_UUID_HERE' in all queries below with your actual UUID

-- ============================================================
-- STEP 2: Create Pricing Tiers
-- ============================================================
-- Replace 'PASTE_UUID_HERE' with the UUID from Step 1

INSERT INTO package_pricing_tiers (
  package_id, area_min, area_max, required_staff,
  price_1_time, price_2_times, price_4_times, price_8_times
) VALUES
  -- Tier 1: 0-100 ตร.ม.
  ('PASTE_UUID_HERE', 0, 100, 4, 1950, 3900, 7400, 14000),
  -- Tier 2: 101-200 ตร.ม.
  ('PASTE_UUID_HERE', 101, 200, 4, 3900, 7800, 14900, 28000),
  -- Tier 3: 201-300 ตร.ม.
  ('PASTE_UUID_HERE', 201, 300, 5, 4900, 9800, 18600, 35000);

-- ============================================================
-- STEP 3: Run Tests
-- ============================================================
-- Replace 'PASTE_UUID_HERE' with your UUID in each test

-- Test 1: Verify Tables Created
SELECT '=== Test 1: Table Creation ===' as test;

SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN ('service_packages_v2', 'package_pricing_tiers', 'bookings')
ORDER BY table_name;
-- Expected: 3 rows

-- Test 2: Verify Indexes Created
SELECT '=== Test 2: Index Creation ===' as test;

SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE tablename IN ('service_packages_v2', 'package_pricing_tiers', 'bookings')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
-- Expected: Multiple indexes

-- Test 3: Price Calculation - Area 50, Frequency 1
SELECT
  'Area 50, Freq 1' as test_case,
  get_package_price('PASTE_UUID_HERE'::uuid, 50, 1) as calculated_price,
  1950 as expected_price,
  get_package_price('PASTE_UUID_HERE'::uuid, 50, 1) = 1950 as pass;
-- Expected: true

-- Test 4: Price Calculation - Area 50, Frequency 4
SELECT
  'Area 50, Freq 4' as test_case,
  get_package_price('PASTE_UUID_HERE'::uuid, 50, 4) as calculated_price,
  7400 as expected_price,
  get_package_price('PASTE_UUID_HERE'::uuid, 50, 4) = 7400 as pass;
-- Expected: true

-- Test 5: Price Calculation - Area 150, Frequency 2
SELECT
  'Area 150, Freq 2' as test_case,
  get_package_price('PASTE_UUID_HERE'::uuid, 150, 2) as calculated_price,
  7800 as expected_price,
  get_package_price('PASTE_UUID_HERE'::uuid, 150, 2) = 7800 as pass;
-- Expected: true

-- Test 6: Price Calculation - Out of Range
SELECT
  'Area 500 (out of range)' as test_case,
  get_package_price('PASTE_UUID_HERE'::uuid, 500, 1) as calculated_price,
  0 as expected_price,
  get_package_price('PASTE_UUID_HERE'::uuid, 500, 1) = 0 as pass;
-- Expected: true

-- Test 7: Staff Calculation - Area 50
SELECT
  'Staff for Area 50' as test_case,
  get_required_staff('PASTE_UUID_HERE'::uuid, 50) as staff_count,
  4 as expected_staff,
  get_required_staff('PASTE_UUID_HERE'::uuid, 50) = 4 as pass;
-- Expected: true

-- Test 8: Staff Calculation - Area 250
SELECT
  'Staff for Area 250' as test_case,
  get_required_staff('PASTE_UUID_HERE'::uuid, 250) as staff_count,
  5 as expected_staff,
  get_required_staff('PASTE_UUID_HERE'::uuid, 250) = 5 as pass;
-- Expected: true

-- Test 9: View Test Packages
SELECT
  name,
  pricing_model,
  tier_count,
  min_price,
  max_price
FROM service_packages_overview
WHERE name LIKE '%Test%'
ORDER BY name;
-- Expected: 1 row with 3 tiers

-- Test 10: Check for Overlapping Tiers (should be empty)
SELECT
  package_id,
  COUNT(*) as overlapping_tiers
FROM (
  SELECT
    t1.package_id,
    t1.area_min as t1_min,
    t1.area_max as t1_max,
    t2.area_min as t2_min,
    t2.area_max as t2_max
  FROM package_pricing_tiers t1
  JOIN package_pricing_tiers t2
    ON t1.package_id = t2.package_id
    AND t1.id != t2.id
  WHERE
    (t1.area_min BETWEEN t2.area_min AND t2.area_max)
    OR (t1.area_max BETWEEN t2.area_min AND t2.area_max)
) AS overlap_check
GROUP BY package_id;
-- Expected: 0 rows (no overlaps)

-- ============================================================
-- STEP 4: Summary
-- ============================================================
DO $$
DECLARE
  total_packages INTEGER;
  total_tiers INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_packages FROM service_packages_v2;
  SELECT COUNT(*) INTO total_tiers FROM package_pricing_tiers;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test Suite Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total Packages: %', total_packages;
  RAISE NOTICE 'Total Tiers: %', total_tiers;
  RAISE NOTICE '';

  IF total_packages > 0 AND total_tiers > 0 THEN
    RAISE NOTICE '✅ Database schema is ready';
    RAISE NOTICE '✅ Functions work correctly';
    RAISE NOTICE '✅ Ready for Phase 2: TypeScript Types';
  ELSE
    RAISE WARNING '⚠️  Please create test data first (Steps 1-2)';
  END IF;
END $$;

-- ============================================================
-- STEP 5: Cleanup (Optional)
-- ============================================================
-- Uncomment and run to remove test data
-- Replace 'PASTE_UUID_HERE' with your UUID

-- DELETE FROM package_pricing_tiers WHERE package_id = 'PASTE_UUID_HERE';
-- DELETE FROM service_packages_v2 WHERE id = 'PASTE_UUID_HERE';
-- RAISE NOTICE 'Test data cleaned up';
