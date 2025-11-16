-- V2 Tiered Pricing Data Migration Helper Script
-- This script helps verify and migrate existing bookings to V2 system

-- =============================================================================
-- PART 1: VERIFICATION QUERIES
-- =============================================================================

-- 1. Check all bookings package assignment status
SELECT
  'Total Bookings' as category,
  COUNT(*) as count
FROM bookings

UNION ALL

SELECT
  'V1 Packages (Fixed Price)' as category,
  COUNT(*) as count
FROM bookings
WHERE service_package_id IS NOT NULL AND package_v2_id IS NULL

UNION ALL

SELECT
  'V2 Packages (Tiered Price)' as category,
  COUNT(*) as count
FROM bookings
WHERE package_v2_id IS NOT NULL AND service_package_id IS NULL

UNION ALL

SELECT
  'Invalid: Both V1 and V2' as category,
  COUNT(*) as count
FROM bookings
WHERE service_package_id IS NOT NULL AND package_v2_id IS NOT NULL

UNION ALL

SELECT
  'Invalid: Neither V1 nor V2' as category,
  COUNT(*) as count
FROM bookings
WHERE service_package_id IS NULL AND package_v2_id IS NULL;


-- 2. List all V2 packages and their tier counts
SELECT
  sp.id,
  sp.name,
  sp.service_type,
  sp.pricing_model,
  COUNT(t.id) as tier_count,
  COUNT(DISTINCT b.id) as booking_count
FROM service_packages_v2 sp
LEFT JOIN service_packages_v2_tiers t ON t.package_id = sp.id
LEFT JOIN bookings b ON b.package_v2_id = sp.id
GROUP BY sp.id, sp.name, sp.service_type, sp.pricing_model
ORDER BY sp.created_at DESC;


-- 3. Check for V2 bookings missing required tiered data
SELECT
  b.id,
  b.booking_date,
  b.total_price,
  b.area_sqm,
  b.frequency,
  sp.name as package_name,
  sp.pricing_model
FROM bookings b
JOIN service_packages_v2 sp ON b.package_v2_id = sp.id
WHERE sp.pricing_model = 'tiered'
  AND (b.area_sqm IS NULL OR b.frequency IS NULL)
ORDER BY b.created_at DESC;


-- 4. List all V2 bookings with their tier matches
SELECT
  b.id,
  b.booking_date,
  b.start_time,
  sp.name as package_name,
  b.area_sqm,
  b.frequency,
  b.total_price as booking_price,
  b.calculated_price,
  t.min_area_sqm,
  t.max_area_sqm,
  t.price_per_time,
  t.estimated_hours,
  t.required_staff
FROM bookings b
JOIN service_packages_v2 sp ON b.package_v2_id = sp.id
LEFT JOIN service_packages_v2_tiers t ON (
  t.package_id = sp.id
  AND b.area_sqm >= t.min_area_sqm
  AND (t.max_area_sqm IS NULL OR b.area_sqm <= t.max_area_sqm)
)
WHERE sp.pricing_model = 'tiered'
ORDER BY b.created_at DESC;


-- =============================================================================
-- PART 2: DATA CLEANUP FUNCTIONS (Run only if needed)
-- =============================================================================

-- Function: Fix bookings with both V1 and V2 packages (choose V2)
-- CAUTION: This will set service_package_id to NULL for bookings with both
-- Uncomment and run only if you have bookings violating the constraint
/*
UPDATE bookings
SET service_package_id = NULL
WHERE service_package_id IS NOT NULL
  AND package_v2_id IS NOT NULL;
*/


-- Function: Fix bookings with neither V1 nor V2 packages
-- CAUTION: This requires manual review - lists bookings that need package assignment
/*
SELECT
  b.id,
  b.booking_date,
  b.total_price,
  c.full_name as customer_name,
  b.created_at
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
WHERE b.service_package_id IS NULL
  AND b.package_v2_id IS NULL
ORDER BY b.created_at DESC;
*/


-- =============================================================================
-- PART 3: MIGRATION HELPER FUNCTION
-- =============================================================================

-- Function to recalculate V2 booking prices based on current tiers
-- Useful if tier prices were updated and you want to update existing bookings
CREATE OR REPLACE FUNCTION recalculate_v2_booking_prices()
RETURNS TABLE(
  booking_id uuid,
  old_price numeric,
  new_price numeric,
  price_difference numeric,
  action_taken text
) AS $$
BEGIN
  RETURN QUERY
  WITH booking_calculations AS (
    SELECT
      b.id as booking_id,
      b.total_price as old_price,
      (t.price_per_time * b.frequency) as new_price,
      (t.price_per_time * b.frequency) - b.total_price as price_diff
    FROM bookings b
    JOIN service_packages_v2 sp ON b.package_v2_id = sp.id
    JOIN service_packages_v2_tiers t ON (
      t.package_id = sp.id
      AND b.area_sqm >= t.min_area_sqm
      AND (t.max_area_sqm IS NULL OR b.area_sqm <= t.max_area_sqm)
    )
    WHERE sp.pricing_model = 'tiered'
      AND b.status = 'pending'  -- Only update pending bookings
      AND ABS((t.price_per_time * b.frequency) - b.total_price) > 0.01  -- Price changed
  )
  SELECT
    bc.booking_id,
    bc.old_price,
    bc.new_price,
    bc.price_diff,
    'Would update (dry run)' as action_taken
  FROM booking_calculations bc;
END;
$$ LANGUAGE plpgsql;

-- Run the dry-run to see what would change
-- SELECT * FROM recalculate_v2_booking_prices();


-- Function to actually perform the price update (run after reviewing dry-run)
CREATE OR REPLACE FUNCTION apply_v2_booking_price_updates()
RETURNS TABLE(
  booking_id uuid,
  old_price numeric,
  new_price numeric,
  updated_at timestamp
) AS $$
BEGIN
  RETURN QUERY
  WITH booking_calculations AS (
    SELECT
      b.id as bid,
      b.total_price as old_price,
      (t.price_per_time * b.frequency) as new_price
    FROM bookings b
    JOIN service_packages_v2 sp ON b.package_v2_id = sp.id
    JOIN service_packages_v2_tiers t ON (
      t.package_id = sp.id
      AND b.area_sqm >= t.min_area_sqm
      AND (t.max_area_sqm IS NULL OR b.area_sqm <= t.max_area_sqm)
    )
    WHERE sp.pricing_model = 'tiered'
      AND b.status = 'pending'
      AND ABS((t.price_per_time * b.frequency) - b.total_price) > 0.01
  ),
  updates AS (
    UPDATE bookings b
    SET
      total_price = bc.new_price,
      calculated_price = bc.new_price,
      updated_at = NOW()
    FROM booking_calculations bc
    WHERE b.id = bc.bid
    RETURNING b.id, bc.old_price, bc.new_price, b.updated_at
  )
  SELECT * FROM updates;
END;
$$ LANGUAGE plpgsql;

-- To apply updates (CAUTION - this modifies data):
-- SELECT * FROM apply_v2_booking_price_updates();


-- =============================================================================
-- PART 4: VALIDATION QUERIES
-- =============================================================================

-- Validate all V2 bookings have matching tiers
SELECT
  COUNT(*) as orphaned_bookings
FROM bookings b
JOIN service_packages_v2 sp ON b.package_v2_id = sp.id
WHERE sp.pricing_model = 'tiered'
  AND NOT EXISTS (
    SELECT 1
    FROM service_packages_v2_tiers t
    WHERE t.package_id = sp.id
      AND b.area_sqm >= t.min_area_sqm
      AND (t.max_area_sqm IS NULL OR b.area_sqm <= t.max_area_sqm)
  );


-- Validate tier coverage (check for gaps in area ranges)
WITH tier_ranges AS (
  SELECT
    package_id,
    min_area_sqm,
    max_area_sqm,
    LEAD(min_area_sqm) OVER (PARTITION BY package_id ORDER BY min_area_sqm) as next_min
  FROM service_packages_v2_tiers
)
SELECT
  sp.name as package_name,
  tr.min_area_sqm,
  tr.max_area_sqm,
  tr.next_min,
  CASE
    WHEN tr.max_area_sqm IS NULL THEN 'OK (unlimited)'
    WHEN tr.next_min IS NULL THEN 'OK (last tier)'
    WHEN tr.max_area_sqm + 1 = tr.next_min THEN 'OK (continuous)'
    ELSE 'WARNING: Gap detected'
  END as coverage_status
FROM tier_ranges tr
JOIN service_packages_v2 sp ON tr.package_id = sp.id
ORDER BY sp.name, tr.min_area_sqm;


-- =============================================================================
-- USAGE INSTRUCTIONS
-- =============================================================================

/*
STEP 1: Verify Current State
Run Part 1 verification queries to understand your data:
- Total bookings count
- V1 vs V2 distribution
- V2 packages and their tiers
- Any orphaned or invalid bookings

STEP 2: Check Data Quality
Run Part 4 validation queries:
- Orphaned bookings (V2 bookings without matching tiers)
- Tier coverage gaps

STEP 3: Cleanup (if needed)
If you have invalid data, uncomment and run Part 2 cleanup queries

STEP 4: Price Recalculation (optional)
If tier prices changed and you want to update pending bookings:
1. Run: SELECT * FROM recalculate_v2_booking_prices();
2. Review the changes
3. If OK, run: SELECT * FROM apply_v2_booking_price_updates();

IMPORTANT NOTES:
- Always backup your database before running UPDATE/DELETE queries
- Test on a development database first
- Part 2 and Part 3 functions modify data - use with caution
- Price updates only affect 'pending' bookings by default
*/

-- Add comments to helper functions
COMMENT ON FUNCTION recalculate_v2_booking_prices() IS
  'Dry-run function to preview V2 booking price updates based on current tier prices. Only shows pending bookings that would change.';

COMMENT ON FUNCTION apply_v2_booking_price_updates() IS
  'Applies V2 booking price updates for pending bookings. USE WITH CAUTION - modifies data!';
