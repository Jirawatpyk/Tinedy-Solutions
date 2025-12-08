-- ============================================================================
-- Migration: Add Refund Payment Status
-- Description: Add 'refund_pending' to payment_status check constraint
-- Date: 2024-12-08
-- ============================================================================

-- Drop existing constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;

-- Add new constraint with refund_pending
-- Note: 'refunded' already exists from previous migration
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('unpaid', 'pending_verification', 'partial', 'paid', 'refund_pending', 'refunded'));

-- Update comment for documentation
COMMENT ON COLUMN bookings.payment_status IS 'Payment status: unpaid, pending_verification, partial, paid, refund_pending, refunded';

-- Note: Payment flow:
-- unpaid → paid → refund_pending → refunded
--       ↘ pending_verification ↗
