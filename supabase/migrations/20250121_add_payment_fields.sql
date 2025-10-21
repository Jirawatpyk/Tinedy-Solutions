-- Add payment tracking fields to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')) DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'line_pay', 'promptpay')),
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_date DATE,
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN bookings.payment_status IS 'Payment status: unpaid, partial, paid, refunded';
COMMENT ON COLUMN bookings.payment_method IS 'Payment method: cash, card, bank_transfer, line_pay, promptpay';
COMMENT ON COLUMN bookings.amount_paid IS 'Amount already paid by customer';
COMMENT ON COLUMN bookings.payment_date IS 'Date when payment was received';
COMMENT ON COLUMN bookings.payment_notes IS 'Additional notes about payment';
