-- ============================================================
-- Service Packages Schema V2 - Enhanced Pricing Structure
-- ============================================================
-- This schema supports area-based pricing tiers and recurring packages
-- Based on actual business requirements from Tinedy CRM

-- Drop existing tables if migrating (careful in production!)
-- DROP TABLE IF EXISTS package_pricing_tiers CASCADE;
-- DROP TABLE IF EXISTS service_packages_v2 CASCADE;

-- ============================================================
-- Main Service Packages Table
-- ============================================================
CREATE TABLE IF NOT EXISTS service_packages_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Basic Information
  name TEXT NOT NULL, -- e.g., "Deep Cleaning Office"
  description TEXT,
  service_type TEXT NOT NULL CHECK (service_type IN ('cleaning', 'training')),
  category TEXT, -- e.g., "office", "condo", "house"

  -- Pricing Model Type
  pricing_model TEXT NOT NULL DEFAULT 'tiered' CHECK (pricing_model IN ('fixed', 'tiered')),
  -- 'fixed' = ราคาเดียว (เหมือนเดิม)
  -- 'tiered' = ราคาแบบช่วงพื้นที่

  -- For fixed pricing only (legacy support)
  duration_minutes INTEGER, -- NULL if using tiered pricing
  base_price DECIMAL(10, 2), -- NULL if using tiered pricing

  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0, -- สำหรับเรียงลำดับการแสดงผล
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Package Pricing Tiers Table
-- ============================================================
-- เก็บราคาตามช่วงพื้นที่และจำนวนครั้ง
CREATE TABLE IF NOT EXISTS package_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID NOT NULL REFERENCES service_packages_v2(id) ON DELETE CASCADE,

  -- Area Range (ตารางเมตร)
  area_min INTEGER NOT NULL, -- เช่น 0, 101, 201
  area_max INTEGER NOT NULL, -- เช่น 100, 200, 300

  -- Required Staff
  required_staff INTEGER NOT NULL DEFAULT 1, -- จำนวนพนักงานที่ต้องการ
  estimated_hours DECIMAL(4, 2), -- เวลาโดยประมาณ (ชั่วโมง)

  -- Pricing by Frequency (ราคาตามจำนวนครั้ง)
  price_1_time DECIMAL(10, 2) NOT NULL, -- ราคา 1 ครั้ง
  price_2_times DECIMAL(10, 2), -- ราคา 2 ครั้ง (ต่อเดือน)
  price_4_times DECIMAL(10, 2), -- ราคา 4 ครั้ง (ต่อเดือน)
  price_8_times DECIMAL(10, 2), -- ราคา 8 ครั้ง (ต่อเดือน)

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CHECK (area_min >= 0),
  CHECK (area_max > area_min),
  CHECK (required_staff > 0),
  UNIQUE(package_id, area_min, area_max) -- ป้องกัน overlap
);

-- ============================================================
-- Indexes for Performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_service_packages_v2_service_type
  ON service_packages_v2(service_type);

CREATE INDEX IF NOT EXISTS idx_service_packages_v2_category
  ON service_packages_v2(category);

CREATE INDEX IF NOT EXISTS idx_service_packages_v2_active
  ON service_packages_v2(is_active);

CREATE INDEX IF NOT EXISTS idx_package_pricing_tiers_package_id
  ON package_pricing_tiers(package_id);

CREATE INDEX IF NOT EXISTS idx_package_pricing_tiers_area
  ON package_pricing_tiers(area_min, area_max);

-- ============================================================
-- Updated Timestamp Triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_service_packages_v2_updated_at
  BEFORE UPDATE ON service_packages_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_package_pricing_tiers_updated_at
  BEFORE UPDATE ON package_pricing_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Sample Data (ตามรูปที่ให้มา)
-- ============================================================

-- Deep Cleaning Office
INSERT INTO service_packages_v2 (name, description, service_type, category, pricing_model)
VALUES (
  'Deep Cleaning Office',
  'บริการทำความสะอาดอาคารสำนักงานแบบเข้มข้น',
  'cleaning',
  'office',
  'tiered'
) RETURNING id; -- สมมติได้ id = 'xxx-office'

-- สำหรับ Deep Cleaning Office - ใช้ id จริงที่ได้จากด้านบน
-- INSERT INTO package_pricing_tiers (package_id, area_min, area_max, required_staff, price_1_time, price_2_times, price_4_times, price_8_times)
-- VALUES
--   ('xxx-office', 0, 100, 4, 1950, 3900, 7400, 14000),
--   ('xxx-office', 101, 200, 4, 3900, 7800, 14900, 28000),
--   ('xxx-office', 201, 300, 5, 4900, 9800, 18600, 35000),
--   ('xxx-office', 301, 400, 8, 5900, 11800, 22400, 42500),
--   ('xxx-office', 401, 500, 8, 6900, 13800, 26200, 49600);

-- Deep Cleaning Condo
INSERT INTO service_packages_v2 (name, description, service_type, category, pricing_model)
VALUES (
  'Deep Cleaning Condo',
  'บริการทำความสะอาดคอนโดแบบเข้มข้น',
  'cleaning',
  'condo',
  'tiered'
) RETURNING id; -- สมมติได้ id = 'xxx-condo'

-- สำหรับ Deep Cleaning Condo
-- INSERT INTO package_pricing_tiers (package_id, area_min, area_max, required_staff, price_1_time, price_2_times, price_4_times, price_8_times)
-- VALUES
--   ('xxx-condo', 0, 90, 4, 3900, 7800, 14800, 28000),
--   ('xxx-condo', 91, 150, 4, 5900, 11800, 22400, 42500),
--   ('xxx-condo', 151, 250, 6, 7900, 15800, 30000, 56900),
--   ('xxx-condo', 251, 350, 6, 11000, 22000, 41800, 79000),
--   ('xxx-condo', 351, 450, 8, 17900, 35800, 68000, 128900);

-- ============================================================
-- Helper Function: Get Price for Area and Frequency
-- ============================================================
CREATE OR REPLACE FUNCTION get_package_price(
  p_package_id UUID,
  p_area INTEGER,
  p_frequency INTEGER DEFAULT 1
) RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_price DECIMAL(10, 2);
BEGIN
  -- Find the appropriate tier
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
    AND p_area >= area_min
    AND p_area <= area_max
  LIMIT 1;

  RETURN COALESCE(v_price, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Helper Function: Get Required Staff for Area
-- ============================================================
CREATE OR REPLACE FUNCTION get_required_staff(
  p_package_id UUID,
  p_area INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_staff INTEGER;
BEGIN
  SELECT required_staff INTO v_staff
  FROM package_pricing_tiers
  WHERE package_id = p_package_id
    AND p_area >= area_min
    AND p_area <= area_max
  LIMIT 1;

  RETURN COALESCE(v_staff, 1);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- View: All Packages with Tier Count
-- ============================================================
CREATE OR REPLACE VIEW service_packages_overview AS
SELECT
  sp.*,
  COUNT(pt.id) as tier_count,
  MIN(pt.price_1_time) as min_price,
  MAX(pt.price_1_time) as max_price
FROM service_packages_v2 sp
LEFT JOIN package_pricing_tiers pt ON sp.id = pt.package_id
GROUP BY sp.id;

-- ============================================================
-- Row Level Security (RLS) - Optional
-- ============================================================
-- ALTER TABLE service_packages_v2 ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE package_pricing_tiers ENABLE ROW LEVEL SECURITY;

-- Allow public read for active packages
-- CREATE POLICY "Allow public read active packages" ON service_packages_v2
--   FOR SELECT USING (is_active = true);

-- CREATE POLICY "Allow public read pricing tiers" ON package_pricing_tiers
--   FOR SELECT USING (true);

-- Admin full access (assuming profiles.role = 'admin')
-- CREATE POLICY "Allow admin full access packages" ON service_packages_v2
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM profiles
--       WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
--     )
--   );

-- CREATE POLICY "Allow admin full access tiers" ON package_pricing_tiers
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM profiles
--       WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
--     )
--   );

-- ============================================================
-- Migration Notes
-- ============================================================
-- 1. สามารถใช้ทั้ง 'fixed' และ 'tiered' pricing model ร่วมกัน
-- 2. Package เดิมสามารถ migrate โดยตั้ง pricing_model = 'fixed'
-- 3. ใช้ get_package_price() function เพื่อคำนวณราคาอัตโนมัติ
-- 4. ระบบจะต้องเพิ่มฟิลด์ 'area' และ 'frequency' ใน bookings table
