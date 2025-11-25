-- Migration: Preserve bookings when customer is deleted
-- Description: Change foreign key from CASCADE to SET NULL so bookings remain when customer is deleted
-- Date: 2025-01-25

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS bookings_customer_id_fkey;

-- Step 2: Add new foreign key with SET NULL behavior
ALTER TABLE bookings
ADD CONSTRAINT bookings_customer_id_fkey
  FOREIGN KEY (customer_id)
  REFERENCES customers(id)
  ON DELETE SET NULL;

-- Ensure customer_id column allows NULL
ALTER TABLE bookings
ALTER COLUMN customer_id DROP NOT NULL;

-- Add comment for documentation
COMMENT ON CONSTRAINT bookings_customer_id_fkey ON bookings IS
'SET NULL on delete to preserve booking history when customer is deleted';
