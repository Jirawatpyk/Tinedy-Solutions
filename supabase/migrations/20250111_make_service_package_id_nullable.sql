-- Make service_package_id nullable to support V2 packages
-- When using V2 packages, package_v2_id is used instead of service_package_id

ALTER TABLE bookings
  ALTER COLUMN service_package_id DROP NOT NULL;

-- Add constraint to ensure either V1 or V2 package is selected
ALTER TABLE bookings
  ADD CONSTRAINT bookings_package_check
  CHECK (
    (service_package_id IS NOT NULL AND package_v2_id IS NULL) OR
    (service_package_id IS NULL AND package_v2_id IS NOT NULL)
  );

-- Add comment
COMMENT ON CONSTRAINT bookings_package_check ON bookings IS
  'Ensures that either service_package_id (V1) or package_v2_id (V2) is set, but not both';
