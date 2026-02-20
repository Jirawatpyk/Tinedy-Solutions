-- Migration: Update get_package_price to read from frequency_prices JSONB
-- Previously only read from legacy price_1_time / price_2_times / price_4_times / price_8_times columns
-- Now supports unlimited custom frequencies stored in frequency_prices JSONB
-- Maintains full backward compatibility via fallback to legacy columns

-- Drop existing function first (required when changing parameter signatures/defaults)
DROP FUNCTION IF EXISTS get_package_price(uuid, integer, integer);

CREATE OR REPLACE FUNCTION get_package_price(
  p_package_id UUID,
  p_area_sqm   INTEGER,
  p_frequency  INTEGER
) RETURNS NUMERIC AS $$
DECLARE
  v_tier  RECORD;
  v_price NUMERIC;
BEGIN
  -- Find the tier that covers the requested area
  SELECT * INTO v_tier
  FROM package_pricing_tiers
  WHERE package_id = p_package_id
    AND area_min <= p_area_sqm
    AND area_max >= p_area_sqm
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- 1. Try frequency_prices JSONB first (post-migration / custom frequencies)
  SELECT (elem->>'price')::NUMERIC INTO v_price
  FROM jsonb_array_elements(v_tier.frequency_prices) AS elem
  WHERE (elem->>'times')::INTEGER = p_frequency
  LIMIT 1;

  -- 2. Fallback to legacy columns (pre-migration rows where frequency_prices is empty)
  IF v_price IS NULL THEN
    CASE p_frequency
      WHEN 1 THEN v_price := v_tier.price_1_time;
      WHEN 2 THEN v_price := v_tier.price_2_times;
      WHEN 4 THEN v_price := v_tier.price_4_times;
      WHEN 8 THEN v_price := v_tier.price_8_times;
      ELSE         v_price := NULL;
    END CASE;
  END IF;

  RETURN COALESCE(v_price, 0);
END;
$$ LANGUAGE plpgsql STABLE;
