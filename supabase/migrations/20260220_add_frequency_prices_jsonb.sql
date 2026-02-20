-- Migration: Add frequency_prices JSONB column to package_pricing_tiers
-- Replaces 4 fixed price columns with a flexible JSONB array
-- Format: [{"times": 1, "price": 1500}, {"times": 4, "price": 5400}, ...]

-- Step 1: Add the new column
ALTER TABLE package_pricing_tiers
  ADD COLUMN IF NOT EXISTS frequency_prices JSONB NOT NULL DEFAULT '[]';

-- Step 2: Migrate existing data from 4 fixed columns into JSONB array
-- Note: price_1_time is always included (NOT NULL column), even if value is 0.
-- A zero price means "service offered for free" not "service not offered".
-- Rows with price_2/4/8_times = NULL are excluded — NULL = "not offered at that frequency".
UPDATE package_pricing_tiers AS pt
SET frequency_prices = (
  SELECT COALESCE(
    jsonb_agg(entry ORDER BY (entry->>'times')::int),
    '[]'::jsonb
  )
  FROM (
    SELECT jsonb_build_object('times', 1, 'price', pt.price_1_time) AS entry

    UNION ALL

    SELECT jsonb_build_object('times', 2, 'price', pt.price_2_times)
    WHERE pt.price_2_times IS NOT NULL

    UNION ALL

    SELECT jsonb_build_object('times', 4, 'price', pt.price_4_times)
    WHERE pt.price_4_times IS NOT NULL

    UNION ALL

    SELECT jsonb_build_object('times', 8, 'price', pt.price_8_times)
    WHERE pt.price_8_times IS NOT NULL
  ) sub
);

-- Step 3: Add a GIN index for faster JSONB queries (optional, recommended)
CREATE INDEX IF NOT EXISTS idx_package_pricing_tiers_frequency_prices
  ON package_pricing_tiers USING GIN (frequency_prices);
