-- ===================================================================
-- Fix payment_method CHECK constraint
--
-- Problem: Original migration used ('cash','card','bank_transfer','line_pay','promptpay')
-- App PaymentMethod enum: { cash, transfer, credit_card, promptpay }
-- Mismatch causes constraint violation on booking update (e.g., slip upload)
--
-- Fix:
--   1. Migrate existing data from old values to new values
--   2. Replace constraint to match app PaymentMethod enum
-- ===================================================================

-- Step 1: Migrate existing data to new values (before changing constraint)
UPDATE bookings SET payment_method = 'transfer'    WHERE payment_method = 'bank_transfer';
UPDATE bookings SET payment_method = 'credit_card'  WHERE payment_method = 'card';
UPDATE bookings SET payment_method = NULL            WHERE payment_method = 'line_pay';

-- Step 2: Drop old constraint (name may vary; search pg_constraint first)
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'bookings'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%payment_method%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE bookings DROP CONSTRAINT %I', v_constraint_name);
    RAISE NOTICE 'Dropped old constraint: %', v_constraint_name;
  ELSE
    RAISE NOTICE 'No payment_method constraint found — skipping drop';
  END IF;
END $$;

-- Step 3: Add corrected constraint matching app PaymentMethod enum
ALTER TABLE bookings
  ADD CONSTRAINT bookings_payment_method_check
  CHECK (payment_method IN ('cash', 'credit_card', 'transfer', 'promptpay'));

COMMENT ON COLUMN bookings.payment_method IS
  'Payment method: cash | credit_card | transfer | promptpay';

-- Verify
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM bookings
  WHERE payment_method NOT IN ('cash', 'credit_card', 'transfer', 'promptpay')
    AND payment_method IS NOT NULL;
  IF v_count > 0 THEN
    RAISE WARNING '% rows still have invalid payment_method values!', v_count;
  ELSE
    RAISE NOTICE 'payment_method constraint updated. All rows valid.';
  END IF;
END $$;
