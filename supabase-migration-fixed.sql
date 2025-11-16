-- ============================================================
-- Complete Migration Script - Service Packages V2 with Sample Data
-- ============================================================
-- รันไฟล์นี้ครั้งเดียวใน Supabase SQL Editor
-- แก้ไขแล้ว: DROP ฟังก์ชันเก่าก่อนสร้างใหม่

-- ============================================================
-- 0. Drop existing functions if they exist (to avoid conflicts)
-- ============================================================
DROP FUNCTION IF EXISTS get_package_price(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_required_staff(UUID, INTEGER);

-- ============================================================
-- 1. Create Tables
-- ============================================================
CREATE TABLE IF NOT EXISTS service_packages_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  service_type TEXT NOT NULL CHECK (service_type IN ('cleaning', 'training')),
  category TEXT,
  pricing_model TEXT NOT NULL DEFAULT 'tiered' CHECK (pricing_model IN ('fixed', 'tiered')),
  duration_minutes INTEGER,
  base_price DECIMAL(10, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS package_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID NOT NULL REFERENCES service_packages_v2(id) ON DELETE CASCADE,
  area_min INTEGER NOT NULL,
  area_max INTEGER NOT NULL,
  required_staff INTEGER NOT NULL DEFAULT 1,
  estimated_hours DECIMAL(4, 1),
  price_1_time DECIMAL(10, 2) NOT NULL,
  price_2_times DECIMAL(10, 2),
  price_4_times DECIMAL(10, 2),
  price_8_times DECIMAL(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_area_range CHECK (area_max >= area_min),
  CONSTRAINT valid_prices CHECK (
    price_1_time > 0 AND
    (price_2_times IS NULL OR price_2_times > 0) AND
    (price_4_times IS NULL OR price_4_times > 0) AND
    (price_8_times IS NULL OR price_8_times > 0)
  )
);

-- ============================================================
-- 2. Create Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_packages_v2_service_type ON service_packages_v2(service_type);
CREATE INDEX IF NOT EXISTS idx_packages_v2_category ON service_packages_v2(category);
CREATE INDEX IF NOT EXISTS idx_packages_v2_active ON service_packages_v2(is_active);
CREATE INDEX IF NOT EXISTS idx_tiers_package_id ON package_pricing_tiers(package_id);
CREATE INDEX IF NOT EXISTS idx_tiers_area_range ON package_pricing_tiers(area_min, area_max);

-- ============================================================
-- 3. Create Functions
-- ============================================================

-- Function: Get price for specific area and frequency
CREATE OR REPLACE FUNCTION get_package_price(
  p_package_id UUID,
  p_area_sqm INTEGER,
  p_frequency INTEGER DEFAULT 1
) RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_price DECIMAL(10, 2);
BEGIN
  SELECT
    CASE p_frequency
      WHEN 1 THEN price_1_time
      WHEN 2 THEN price_2_times
      WHEN 4 THEN price_4_times
      WHEN 8 THEN price_8_times
      ELSE price_1_time
    END INTO v_price
  FROM package_pricing_tiers
  WHERE package_id = p_package_id
    AND p_area_sqm >= area_min
    AND p_area_sqm <= area_max
  LIMIT 1;

  RETURN COALESCE(v_price, 0);
END;
$$ LANGUAGE plpgsql;

-- Function: Get required staff for specific area
CREATE OR REPLACE FUNCTION get_required_staff(
  p_package_id UUID,
  p_area_sqm INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_staff INTEGER;
BEGIN
  SELECT required_staff INTO v_staff
  FROM package_pricing_tiers
  WHERE package_id = p_package_id
    AND p_area_sqm >= area_min
    AND p_area_sqm <= area_max
  LIMIT 1;

  RETURN COALESCE(v_staff, 1);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. Create View
-- ============================================================
CREATE OR REPLACE VIEW service_packages_overview AS
SELECT
  sp.*,
  COUNT(pt.id) AS tier_count,
  MIN(LEAST(
    pt.price_1_time,
    COALESCE(pt.price_2_times, pt.price_1_time),
    COALESCE(pt.price_4_times, pt.price_1_time),
    COALESCE(pt.price_8_times, pt.price_1_time)
  )) AS min_price,
  MAX(GREATEST(
    pt.price_1_time,
    COALESCE(pt.price_2_times, 0),
    COALESCE(pt.price_4_times, 0),
    COALESCE(pt.price_8_times, 0)
  )) AS max_price
FROM service_packages_v2 sp
LEFT JOIN package_pricing_tiers pt ON sp.id = pt.package_id
GROUP BY sp.id;

-- ============================================================
-- 5. Insert Sample Data with Tiers
-- ============================================================

DO $$
DECLARE
  v_office_id UUID;
  v_condo_id UUID;
  v_house_id UUID;
BEGIN
  -- Deep Cleaning Office
  INSERT INTO service_packages_v2 (name, description, service_type, category, pricing_model, display_order)
  VALUES (
    'Deep Cleaning Office',
    'บริการทำความสะอาดออฟฟิศแบบเข้มข้น เหมาะสำหรับพื้นที่ทำงาน',
    'cleaning',
    'office',
    'tiered',
    1
  ) RETURNING id INTO v_office_id;

  -- Insert tiers for Office
  INSERT INTO package_pricing_tiers (package_id, area_min, area_max, required_staff, estimated_hours, price_1_time, price_2_times, price_4_times, price_8_times)
  VALUES
    (v_office_id, 0, 100, 2, 2.5, 1950, 3900, 7400, 14000),
    (v_office_id, 101, 200, 4, 4.0, 2950, 5900, 11200, 21200),
    (v_office_id, 201, 300, 5, 5.5, 4900, 9800, 18600, 35000),
    (v_office_id, 301, 400, 8, 7.0, 5900, 11800, 22400, 42500),
    (v_office_id, 401, 500, 8, 8.5, 6900, 13800, 26200, 49600);

  -- Deep Cleaning Condo
  INSERT INTO service_packages_v2 (name, description, service_type, category, pricing_model, display_order)
  VALUES (
    'Deep Cleaning Condo',
    'บริการทำความสะอาดคอนโดแบบเข้มข้น ครอบคลุมทุกพื้นที่',
    'cleaning',
    'condo',
    'tiered',
    2
  ) RETURNING id INTO v_condo_id;

  -- Insert tiers for Condo
  INSERT INTO package_pricing_tiers (package_id, area_min, area_max, required_staff, estimated_hours, price_1_time, price_2_times, price_4_times, price_8_times)
  VALUES
    (v_condo_id, 0, 90, 2, 2.0, 3900, 7800, 14800, 28000),
    (v_condo_id, 91, 150, 4, 3.5, 5900, 11800, 22400, 42500),
    (v_condo_id, 151, 250, 6, 5.0, 7900, 15800, 30000, 56900),
    (v_condo_id, 251, 350, 6, 6.5, 11000, 22000, 41800, 79000),
    (v_condo_id, 351, 450, 8, 8.0, 17900, 35800, 68000, 128900);

  -- Deep Cleaning House
  INSERT INTO service_packages_v2 (name, description, service_type, category, pricing_model, display_order)
  VALUES (
    'Deep Cleaning House',
    'บริการทำความสะอาดบ้านแบบเข้มข้น ทำทุกมุม',
    'cleaning',
    'house',
    'tiered',
    3
  ) RETURNING id INTO v_house_id;

  -- Insert tiers for House
  INSERT INTO package_pricing_tiers (package_id, area_min, area_max, required_staff, estimated_hours, price_1_time, price_2_times, price_4_times, price_8_times)
  VALUES
    (v_house_id, 0, 150, 4, 3.0, 4900, 9800, 18600, 35000),
    (v_house_id, 151, 250, 6, 5.0, 7900, 15800, 30000, 56900),
    (v_house_id, 251, 350, 8, 7.0, 11000, 22000, 41800, 79000),
    (v_house_id, 351, 500, 10, 9.0, 17900, 35800, 68000, 128900);

END $$;

-- ============================================================
-- 6. Enable RLS (Row Level Security)
-- ============================================================
ALTER TABLE service_packages_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_pricing_tiers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access to all users" ON service_packages_v2;
DROP POLICY IF EXISTS "Allow read access to all users" ON package_pricing_tiers;
DROP POLICY IF EXISTS "Allow admins to manage packages" ON service_packages_v2;
DROP POLICY IF EXISTS "Allow admins to manage tiers" ON package_pricing_tiers;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to all users" ON service_packages_v2
  FOR SELECT USING (true);

CREATE POLICY "Allow read access to all users" ON package_pricing_tiers
  FOR SELECT USING (true);

-- Allow admins to manage packages (adjust as needed)
CREATE POLICY "Allow admins to manage packages" ON service_packages_v2
  FOR ALL USING (true);

CREATE POLICY "Allow admins to manage tiers" ON package_pricing_tiers
  FOR ALL USING (true);

-- ============================================================
-- 7. Verification Queries
-- ============================================================

-- Verify packages created
SELECT
  name,
  category,
  pricing_model,
  (SELECT COUNT(*) FROM package_pricing_tiers WHERE package_id = sp.id) AS tier_count
FROM service_packages_v2 sp
ORDER BY display_order;

-- Verify functions work
SELECT
  sp.name,
  get_package_price(sp.id, 150, 4) AS price_for_150sqm_weekly,
  get_required_staff(sp.id, 150) AS staff_for_150sqm
FROM service_packages_v2 sp
WHERE sp.pricing_model = 'tiered';
