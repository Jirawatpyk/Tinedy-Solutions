-- ============================================================
-- Test Functions for Service Packages V2
-- ============================================================
-- Comprehensive tests for tiered pricing functionality
-- Run after creating tables and functions

-- ============================================================
-- Test Data Setup
-- ============================================================

-- Create test package: Deep Cleaning Office
INSERT INTO service_packages_v2 (
  name, description, service_type, category, pricing_model
) VALUES (
  'Deep Cleaning Office (Test)',
  'Test package for tiered pricing',
  'cleaning',
  'office',
  'tiered'
) RETURNING id as test_package_id;

-- Store the returned ID for use in subsequent queries
-- Replace 'YOUR_PACKAGE_ID_HERE' with the actual UUID returned above

\set test_pkg_id 'YOUR_PACKAGE_ID_HERE'

-- Create pricing tiers for test package
INSERT INTO package_pricing_tiers (
  package_id, area_min, area_max, required_staff,
  price_1_time, price_2_times, price_4_times, price_8_times
) VALUES
  -- Tier 1: 0-100 ตร.ม.
  (:'test_pkg_id', 0, 100, 4, 1950, 3900, 7400, 14000),
  -- Tier 2: 101-200 ตร.ม.
  (:'test_pkg_id', 101, 200, 4, 3900, 7800, 14900, 28000),
  -- Tier 3: 201-300 ตร.ม.
  (:'test_pkg_id', 201, 300, 5, 4900, 9800, 18600, 35000);

-- ============================================================
-- Test 1: Verify Tables Created
-- ============================================================
SELECT '=== Test 1: Table Creation ===' as test;

SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN ('service_packages_v2', 'package_pricing_tiers', 'bookings')
ORDER BY table_name;

-- Expected: All 3 tables exist

-- ============================================================
-- Test 2: Verify Indexes Created
-- ============================================================
SELECT '=== Test 2: Index Creation ===' as test;

SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE tablename IN ('service_packages_v2', 'package_pricing_tiers', 'bookings')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Expected: Multiple indexes found

-- ============================================================
-- Test 3: Test Price Calculation Function
-- ============================================================
SELECT '=== Test 3: Price Calculation ===' as test;

-- Test with area 50 (Tier 1), frequency 1
SELECT
  'Area 50, Freq 1' as test_case,
  get_package_price(:'test_pkg_id', 50, 1) as calculated_price,
  1950 as expected_price,
  get_package_price(:'test_pkg_id', 50, 1) = 1950 as pass;

-- Test with area 50 (Tier 1), frequency 4
SELECT
  'Area 50, Freq 4' as test_case,
  get_package_price(:'test_pkg_id', 50, 4) as calculated_price,
  7400 as expected_price,
  get_package_price(:'test_pkg_id', 50, 4) = 7400 as pass;

-- Test with area 150 (Tier 2), frequency 2
SELECT
  'Area 150, Freq 2' as test_case,
  get_package_price(:'test_pkg_id', 150, 2) as calculated_price,
  7800 as expected_price,
  get_package_price(:'test_pkg_id', 150, 2) = 7800 as pass;

-- Test with area 250 (Tier 3), frequency 8
SELECT
  'Area 250, Freq 8' as test_case,
  get_package_price(:'test_pkg_id', 250, 8) as calculated_price,
  35000 as expected_price,
  get_package_price(:'test_pkg_id', 250, 8) = 35000 as pass;

-- Test with area outside range (should return 0)
SELECT
  'Area 500 (out of range)' as test_case,
  get_package_price(:'test_pkg_id', 500, 1) as calculated_price,
  0 as expected_price,
  get_package_price(:'test_pkg_id', 500, 1) = 0 as pass;

-- ============================================================
-- Test 4: Test Required Staff Function
-- ============================================================
SELECT '=== Test 4: Staff Calculation ===' as test;

-- Test with area 50 (Tier 1)
SELECT
  'Area 50' as test_case,
  get_required_staff(:'test_pkg_id', 50) as staff_count,
  4 as expected_staff,
  get_required_staff(:'test_pkg_id', 50) = 4 as pass;

-- Test with area 150 (Tier 2)
SELECT
  'Area 150' as test_case,
  get_required_staff(:'test_pkg_id', 150) as staff_count,
  4 as expected_staff,
  get_required_staff(:'test_pkg_id', 150) = 4 as pass;

-- Test with area 250 (Tier 3)
SELECT
  'Area 250' as test_case,
  get_required_staff(:'test_pkg_id', 250) as staff_count,
  5 as expected_staff,
  get_required_staff(:'test_pkg_id', 250) = 5 as pass;

-- ============================================================
-- Test 5: Test Constraints
-- ============================================================
SELECT '=== Test 5: Constraint Validation ===' as test;

-- Test invalid frequency (should fail)
DO $$
BEGIN
  -- This should raise an error
  INSERT INTO bookings (
    -- ... other required fields ...
    area_sqm, frequency
  ) VALUES (100, 3);  -- Invalid frequency

  RAISE EXCEPTION 'Test FAILED: Invalid frequency was accepted';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'Test PASSED: Invalid frequency rejected ✓';
END $$;

-- Test negative area (should fail)
DO $$
BEGIN
  INSERT INTO bookings (
    -- ... other required fields ...
    area_sqm
  ) VALUES (-50);  -- Negative area

  RAISE EXCEPTION 'Test FAILED: Negative area was accepted';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'Test PASSED: Negative area rejected ✓';
END $$;

-- ============================================================
-- Test 6: Test View
-- ============================================================
SELECT '=== Test 6: Overview View ===' as test;

SELECT
  name,
  pricing_model,
  tier_count,
  min_price,
  max_price
FROM service_packages_overview
WHERE name LIKE '%Test%'
ORDER BY name;

-- ============================================================
-- Test 7: Performance Test
-- ============================================================
SELECT '=== Test 7: Query Performance ===' as test;

EXPLAIN ANALYZE
SELECT
  sp.name,
  pt.area_min,
  pt.area_max,
  pt.price_1_time
FROM service_packages_v2 sp
JOIN package_pricing_tiers pt ON sp.id = pt.package_id
WHERE sp.is_active = true
  AND sp.service_type = 'cleaning'
  AND 150 BETWEEN pt.area_min AND pt.area_max;

-- Expected: Should use indexes, execution time < 50ms

-- ============================================================
-- Test 8: Data Integrity
-- ============================================================
SELECT '=== Test 8: Data Integrity ===' as test;

-- Check for overlapping tiers (should return 0)
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
) overlaps
GROUP BY package_id;

-- Expected: 0 rows (no overlaps)

-- Check for gaps in tier coverage
SELECT
  package_id,
  area_max as gap_start,
  LEAD(area_min) OVER (PARTITION BY package_id ORDER BY area_min) as gap_end,
  LEAD(area_min) OVER (PARTITION BY package_id ORDER BY area_min) - area_max - 1 as gap_size
FROM package_pricing_tiers
WHERE LEAD(area_min) OVER (PARTITION BY package_id ORDER BY area_min) - area_max > 1;

-- Expected: 0 rows (no gaps) or acceptable gaps

-- ============================================================
-- Test Summary
-- ============================================================
SELECT '=== Test Summary ===' as test;

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
  RAISE NOTICE 'If all tests passed:';
  RAISE NOTICE '✅ Database schema is ready';
  RAISE NOTICE '✅ Functions work correctly';
  RAISE NOTICE '✅ Constraints are enforced';
  RAISE NOTICE '✅ Ready for Phase 2';
END $$;

-- ============================================================
-- Cleanup Test Data (Optional)
-- ============================================================
-- Uncomment to remove test package

-- DELETE FROM package_pricing_tiers WHERE package_id = :'test_pkg_id';
-- DELETE FROM service_packages_v2 WHERE id = :'test_pkg_id';
