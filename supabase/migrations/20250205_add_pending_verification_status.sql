-- Add pending_verification to payment_status check constraint
-- This allows slip uploads to set status to 'pending_verification' for admin review

-- Drop existing constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;

-- Add new constraint with pending_verification
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('unpaid', 'pending_verification', 'partial', 'paid', 'refunded'));

-- Update comment for documentation
COMMENT ON COLUMN bookings.payment_status IS 'Payment status: unpaid, pending_verification, partial, paid, refunded';
