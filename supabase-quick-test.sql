-- ============================================================
-- Quick Test for Service Packages V2
-- ============================================================
-- One-shot test - run all at once

DO $$
DECLARE
  test_pkg_id UUID;
  test_price DECIMAL(10, 2);
  test_staff INTEGER;
BEGIN
  -- Create test package
  INSERT INTO service_packages_v2 (
    name, description, service_type, category, pricing_model
  ) VALUES (
    'Quick Test Package',
    'Temporary test package',
    'cleaning',
    'office',
    'tiered'
  ) RETURNING id INTO test_pkg_id;

  RAISE NOTICE 'Created test package: %', test_pkg_id;

  -- Create tiers
  INSERT INTO package_pricing_tiers (
    package_id, area_min, area_max, required_staff,
    price_1_time, price_2_times, price_4_times, price_8_times
  ) VALUES
    (test_pkg_id, 0, 100, 4, 1950, 3900, 7400, 14000),
    (test_pkg_id, 101, 200, 4, 3900, 7800, 14900, 28000),
    (test_pkg_id, 201, 300, 5, 4900, 9800, 18600, 35000);

  RAISE NOTICE 'Created 3 pricing tiers';

  -- Test 1: Price calculation for area 50, freq 1
  SELECT get_package_price(test_pkg_id, 50, 1) INTO test_price;
  IF test_price = 1950 THEN
    RAISE NOTICE '✅ Test 1 PASSED: Price for 50 sqm = 1950';
  ELSE
    RAISE WARNING '❌ Test 1 FAILED: Expected 1950, got %', test_price;
  END IF;

  -- Test 2: Price calculation for area 150, freq 4
  SELECT get_package_price(test_pkg_id, 150, 4) INTO test_price;
  IF test_price = 14900 THEN
    RAISE NOTICE '✅ Test 2 PASSED: Price for 150 sqm x4 = 14900';
  ELSE
    RAISE WARNING '❌ Test 2 FAILED: Expected 14900, got %', test_price;
  END IF;

  -- Test 3: Staff calculation for area 50
  SELECT get_required_staff(test_pkg_id, 50) INTO test_staff;
  IF test_staff = 4 THEN
    RAISE NOTICE '✅ Test 3 PASSED: Staff for 50 sqm = 4';
  ELSE
    RAISE WARNING '❌ Test 3 FAILED: Expected 4, got %', test_staff;
  END IF;

  -- Test 4: Staff calculation for area 250
  SELECT get_required_staff(test_pkg_id, 250) INTO test_staff;
  IF test_staff = 5 THEN
    RAISE NOTICE '✅ Test 4 PASSED: Staff for 250 sqm = 5';
  ELSE
    RAISE WARNING '❌ Test 4 FAILED: Expected 5, got %', test_staff;
  END IF;

  -- Test 5: Out of range
  SELECT get_package_price(test_pkg_id, 500, 1) INTO test_price;
  IF test_price = 0 THEN
    RAISE NOTICE '✅ Test 5 PASSED: Out of range returns 0';
  ELSE
    RAISE WARNING '❌ Test 5 FAILED: Expected 0, got %', test_price;
  END IF;

  -- Cleanup
  DELETE FROM package_pricing_tiers WHERE package_id = test_pkg_id;
  DELETE FROM service_packages_v2 WHERE id = test_pkg_id;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ All Quick Tests Completed';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Database schema is ready for Phase 2!';
END $$;
