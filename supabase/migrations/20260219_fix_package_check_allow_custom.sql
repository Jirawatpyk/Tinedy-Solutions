-- Fix bookings_package_check to allow Custom Job bookings (no package required)
--
-- Old constraint: exactly ONE of (service_package_id, package_v2_id) must be set
-- New constraint: at most ONE may be set (both NULL is allowed for price_mode='custom')

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_package_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_package_check
  CHECK (
    -- Cannot have both V1 and V2 package set simultaneously
    service_package_id IS NULL OR package_v2_id IS NULL
  );

COMMENT ON CONSTRAINT bookings_package_check ON bookings IS
  'Ensures V1 and V2 package are not both set. Both may be NULL for custom-job bookings.';
