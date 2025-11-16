# 🔧 Admin Guide: V2 Package Management
# Tinedy CRM - Tiered Pricing System

**เวอร์ชั่น:** 2.0
**วันที่:** 11 มกราคม 2025
**สำหรับ:** System Administrators, Package Managers

---

## 🎯 ภาพรวม

คู่มือนี้สำหรับ Admin ที่ต้องการสร้างและจัดการ V2 Service Packages (Tiered Pricing) ใน Tinedy CRM

### สิ่งที่จะได้เรียนรู้:
- ✅ สร้าง V2 Package และ Tiers
- ✅ แก้ไขราคาและข้อมูล Tier
- ✅ จัดการ Tier coverage
- ✅ Validate และ Troubleshoot
- ✅ Data migration และ maintenance

---

## 📖 สารบัญ

1. [Database Schema](#1-database-schema)
2. [สร้าง V2 Package](#2-สร้าง-v2-package)
3. [จัดการ Tiers](#3-จัดการ-tiers)
4. [Tier Coverage Planning](#4-tier-coverage-planning)
5. [Data Validation](#5-data-validation)
6. [Common Tasks](#6-common-tasks)
7. [Troubleshooting](#7-troubleshooting)
8. [Best Practices](#8-best-practices)

---

## 1. Database Schema

### Tables Overview

```
service_packages_v2
├── id (uuid, PK)
├── name (text)
├── description (text)
├── service_type (text)
├── pricing_model ('tiered' | 'fixed')
├── is_active (boolean)
├── created_at (timestamp)
└── updated_at (timestamp)

service_packages_v2_tiers
├── id (uuid, PK)
├── package_id (uuid, FK → service_packages_v2.id)
├── min_area_sqm (numeric)
├── max_area_sqm (numeric, nullable)
├── price_per_time (numeric)
├── estimated_hours (numeric)
├── required_staff (integer)
├── created_at (timestamp)
└── updated_at (timestamp)

bookings
├── id (uuid, PK)
├── customer_id (uuid, FK)
├── service_package_id (uuid, FK, nullable) ← V1
├── package_v2_id (uuid, FK, nullable) ← V2
├── area_sqm (numeric, nullable) ← V2 only
├── frequency (integer, nullable) ← V2 only
├── calculated_price (numeric, nullable) ← V2 only
├── total_price (numeric)
├── start_time (time)
├── end_time (time)
└── ... other fields

CONSTRAINT: (service_package_id IS NOT NULL AND package_v2_id IS NULL)
         OR (service_package_id IS NULL AND package_v2_id IS NOT NULL)
```

### Key Relationships

```
service_packages_v2 (1) ──────────< (many) service_packages_v2_tiers
                                       │
                                       │
                                       │
bookings >─────── package_v2_id ──────┘
         ├─────── area_sqm (match tier range)
         └─────── frequency (multiply price)
```

---

## 2. สร้าง V2 Package

### Step 1: สร้าง Package ใหม่

#### ใช้ Supabase Dashboard:

1. เปิด Supabase Dashboard
2. ไปที่ **Table Editor** → `service_packages_v2`
3. กด **Insert** → **Insert row**

```sql
-- หรือใช้ SQL Editor:
INSERT INTO service_packages_v2 (
  name,
  description,
  service_type,
  pricing_model,
  is_active
) VALUES (
  'Premium Home Cleaning',
  'Professional home cleaning service with tiered pricing based on area',
  'Cleaning',
  'tiered',
  true
);
```

#### ค่าที่ต้องกรอก:

| Field | Type | Required | ตัวอย่าง |
|-------|------|----------|----------|
| name | text | ✅ | "Premium Home Cleaning" |
| description | text | ❌ | "Professional cleaning with..." |
| service_type | text | ✅ | "Cleaning", "Maintenance", "Repair" |
| pricing_model | text | ✅ | "tiered" (ต้องเป็น tiered สำหรับ V2) |
| is_active | boolean | ✅ | true |

---

### Step 2: บันทึก Package ID

หลังจาก insert แล้ว:
1. Copy **ID** ของ package ที่สร้าง (UUID format)
2. จะใช้ ID นี้สร้าง tiers ในขั้นตอนถัดไป

**ตัวอย่าง UUID:**
```
a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

---

## 3. จัดการ Tiers

### สร้าง Tiers สำหรับ Package

Tiers คือ ช่วงพื้นที่และราคาสำหรับแต่ละช่วง

#### ตัวอย่าง: Premium Home Cleaning

```sql
-- Tier 1: Small homes (0-100 sqm)
INSERT INTO service_packages_v2_tiers (
  package_id,
  min_area_sqm,
  max_area_sqm,
  price_per_time,
  estimated_hours,
  required_staff
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  -- package_id จาก Step 2
  0,          -- min_area_sqm
  100,        -- max_area_sqm
  2900,       -- price_per_time (THB)
  3,          -- estimated_hours
  2           -- required_staff
);

-- Tier 2: Medium homes (101-200 sqm)
INSERT INTO service_packages_v2_tiers (
  package_id,
  min_area_sqm,
  max_area_sqm,
  price_per_time,
  estimated_hours,
  required_staff
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  101,
  200,
  3900,
  4,
  2
);

-- Tier 3: Large homes (201-300 sqm)
INSERT INTO service_packages_v2_tiers (
  package_id,
  min_area_sqm,
  max_area_sqm,
  price_per_time,
  estimated_hours,
  required_staff
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  201,
  300,
  5400,
  5,
  3
);

-- Tier 4: Extra large (301+ sqm) - ไม่มี max (unlimited)
INSERT INTO service_packages_v2_tiers (
  package_id,
  min_area_sqm,
  max_area_sqm,
  price_per_time,
  estimated_hours,
  required_staff
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  301,
  NULL,       -- NULL = unlimited
  7200,
  6,
  4
);
```

---

### Tier Fields Explained

| Field | Meaning | ตัวอย่าง | Notes |
|-------|---------|----------|-------|
| **package_id** | ID ของ package | UUID | FK to service_packages_v2 |
| **min_area_sqm** | พื้นที่ขั้นต่ำ | 101 | เริ่มต้นช่วง (inclusive) |
| **max_area_sqm** | พื้นที่สูงสุด | 200 | สิ้นสุดช่วง (inclusive), NULL = ไม่จำกัด |
| **price_per_time** | ราคาต่อครั้ง | 3900 | THB, คูณกับ frequency |
| **estimated_hours** | เวลาโดยประมาณ | 4 | ชั่วโมง, ใช้คำนวณ end_time |
| **required_staff** | จำนวนพนักงาน | 2 | คน, ใช้ check availability |

---

### Tier Planning Template

ใช้ตารางนี้วางแผนก่อนสร้าง tiers:

| Tier | Area Range (sqm) | Price (THB) | Hours | Staff | Notes |
|------|------------------|-------------|-------|-------|-------|
| 1 | 0-100 | 2,900 | 3 | 2 | Small condo |
| 2 | 101-200 | 3,900 | 4 | 2 | Medium home |
| 3 | 201-300 | 5,400 | 5 | 3 | Large home |
| 4 | 301+ | 7,200 | 6 | 4 | Extra large |

---

## 4. Tier Coverage Planning

### การวางแผน Tier Coverage

**Tier Coverage** = ช่วงพื้นที่ที่ tiers ครอบคลุม

#### ✅ Good Coverage (ไม่มีช่องว่าง)

```
Tier 1:     0 ─────── 100
Tier 2:          101 ─────── 200
Tier 3:                  201 ─────── 300
Tier 4:                          301 ────────> ∞
```

**คุณสมบัติ:**
- ✅ ไม่มีช่องว่างระหว่าง tiers
- ✅ Tier 4 ไม่มี max (NULL) ครอบคลุมทุกพื้นที่ > 301
- ✅ ทุก area จะ match tier ได้

---

#### ❌ Bad Coverage (มีช่องว่าง)

```
Tier 1:     0 ─────── 100
Tier 2:          101 ─────── 200
                              (gap: 201-250)
Tier 3:                          251 ─────── 300
Tier 4:                                  301 ──> 500
                                                 (gap: 501+)
```

**ปัญหา:**
- ❌ พื้นที่ 201-250 ไม่มี tier match
- ❌ พื้นที่ > 500 ไม่มี tier match
- ❌ Booking ที่อยู่ในช่องว่างจะ error

---

### Validation Query: Check Coverage Gaps

```sql
-- หา tier gaps
WITH tier_ranges AS (
  SELECT
    package_id,
    min_area_sqm,
    max_area_sqm,
    LEAD(min_area_sqm) OVER (PARTITION BY package_id ORDER BY min_area_sqm) as next_min
  FROM service_packages_v2_tiers
)
SELECT
  sp.name as package_name,
  tr.min_area_sqm,
  tr.max_area_sqm,
  tr.next_min,
  CASE
    WHEN tr.max_area_sqm IS NULL THEN 'OK (unlimited)'
    WHEN tr.next_min IS NULL THEN 'OK (last tier)'
    WHEN tr.max_area_sqm + 1 = tr.next_min THEN 'OK (continuous)'
    ELSE 'WARNING: Gap detected'
  END as coverage_status
FROM tier_ranges tr
JOIN service_packages_v2 sp ON tr.package_id = sp.id
ORDER BY sp.name, tr.min_area_sqm;
```

**Output ตัวอย่าง:**

| package_name | min_area | max_area | next_min | coverage_status |
|--------------|----------|----------|----------|-----------------|
| Premium Cleaning | 0 | 100 | 101 | ✅ OK (continuous) |
| Premium Cleaning | 101 | 200 | 201 | ✅ OK (continuous) |
| Premium Cleaning | 201 | 300 | 301 | ✅ OK (continuous) |
| Premium Cleaning | 301 | NULL | NULL | ✅ OK (unlimited) |

---

### Fixing Coverage Gaps

**สถานการณ์:** พบ gap ระหว่าง 201-250

**วิธีแก้:**

**Option 1:** ขยาย Tier 2
```sql
UPDATE service_packages_v2_tiers
SET max_area_sqm = 250
WHERE package_id = 'xxx' AND min_area_sqm = 101;
```

**Option 2:** เพิ่ม Tier ใหม่ (201-250)
```sql
INSERT INTO service_packages_v2_tiers (...)
VALUES (..., 201, 250, ...);
```

**Option 3:** ลด min ของ Tier 3
```sql
UPDATE service_packages_v2_tiers
SET min_area_sqm = 201
WHERE package_id = 'xxx' AND min_area_sqm = 251;
```

---

## 5. Data Validation

### ใช้ Migration Helper Script

เปิดไฟล์: `supabase/migrations/20250111_v2_data_migration_helper.sql`

### Validation 1: Package & Booking Distribution

```sql
-- จำนวน bookings แต่ละประเภท
SELECT
  'Total Bookings' as category, COUNT(*) as count FROM bookings
UNION ALL
SELECT 'V1 Packages', COUNT(*) FROM bookings
  WHERE service_package_id IS NOT NULL AND package_v2_id IS NULL
UNION ALL
SELECT 'V2 Packages', COUNT(*) FROM bookings
  WHERE package_v2_id IS NOT NULL AND service_package_id IS NULL;
```

**ตัวอย่าง Output:**

| category | count |
|----------|-------|
| Total Bookings | 150 |
| V1 Packages | 120 |
| V2 Packages | 30 |

---

### Validation 2: List V2 Packages

```sql
-- List V2 packages และจำนวน tiers
SELECT
  sp.id,
  sp.name,
  sp.service_type,
  COUNT(t.id) as tier_count,
  COUNT(DISTINCT b.id) as booking_count
FROM service_packages_v2 sp
LEFT JOIN service_packages_v2_tiers t ON t.package_id = sp.id
LEFT JOIN bookings b ON b.package_v2_id = sp.id
GROUP BY sp.id, sp.name, sp.service_type
ORDER BY sp.created_at DESC;
```

**ตัวอย่าง Output:**

| name | service_type | tier_count | booking_count |
|------|-------------|------------|---------------|
| Premium Cleaning | Cleaning | 4 | 15 |
| Basic Repair | Maintenance | 3 | 8 |

---

### Validation 3: Orphaned Bookings

ตรวจสอบ V2 bookings ที่ไม่มี tier match:

```sql
SELECT COUNT(*) as orphaned_bookings
FROM bookings b
JOIN service_packages_v2 sp ON b.package_v2_id = sp.id
WHERE sp.pricing_model = 'tiered'
  AND NOT EXISTS (
    SELECT 1 FROM service_packages_v2_tiers t
    WHERE t.package_id = sp.id
      AND b.area_sqm >= t.min_area_sqm
      AND (t.max_area_sqm IS NULL OR b.area_sqm <= t.max_area_sqm)
  );
```

**Expected Result:** `0` (ไม่มี orphaned bookings)

**ถ้า > 0:** มี bookings ที่ไม่ match tier → ต้องแก้ไข tier coverage

---

### Validation 4: Missing Tiered Data

ตรวจสอบ V2 bookings ที่ขาด area_sqm หรือ frequency:

```sql
SELECT
  b.id,
  b.booking_date,
  b.area_sqm,
  b.frequency,
  sp.name as package_name
FROM bookings b
JOIN service_packages_v2 sp ON b.package_v2_id = sp.id
WHERE sp.pricing_model = 'tiered'
  AND (b.area_sqm IS NULL OR b.frequency IS NULL);
```

**Expected Result:** Empty (ไม่มี rows)

**ถ้ามี rows:** bookings เหล่านี้มีปัญหา → ต้องแก้ไขด้วยตนเอง

---

## 6. Common Tasks

### Task 1: เปลี่ยนราคา Tier

**สถานการณ์:** ต้องการเพิ่มราคา Tier 2 จาก 3,900 → 4,200 THB

```sql
-- 1. หา tier ที่ต้องการแก้ไข
SELECT * FROM service_packages_v2_tiers
WHERE package_id = 'xxx'
  AND min_area_sqm = 101
  AND max_area_sqm = 200;

-- 2. Update ราคา
UPDATE service_packages_v2_tiers
SET
  price_per_time = 4200,
  updated_at = NOW()
WHERE package_id = 'xxx'
  AND min_area_sqm = 101;

-- 3. Verify
SELECT * FROM service_packages_v2_tiers
WHERE package_id = 'xxx'
ORDER BY min_area_sqm;
```

**⚠️ สำคัญ:**
- Bookings เก่าจะยังคงใช้ราคาเดิม (stored in database)
- Bookings ใหม่จะใช้ราคาใหม่
- ถ้าต้องการ update bookings เก่าด้วย → ใช้ migration helper function

---

### Task 2: เพิ่ม Tier ใหม่

**สถานการณ์:** ต้องการเพิ่ม Tier 5 สำหรับ super large homes (501+ sqm)

```sql
-- 1. เช็ค tier สูงสุดปัจจุบัน
SELECT * FROM service_packages_v2_tiers
WHERE package_id = 'xxx'
ORDER BY min_area_sqm DESC
LIMIT 1;

-- 2. Update tier เก่าให้มี max (ถ้าเป็น NULL)
UPDATE service_packages_v2_tiers
SET max_area_sqm = 500
WHERE package_id = 'xxx'
  AND min_area_sqm = 301;

-- 3. Insert tier ใหม่
INSERT INTO service_packages_v2_tiers (
  package_id,
  min_area_sqm,
  max_area_sqm,
  price_per_time,
  estimated_hours,
  required_staff
) VALUES (
  'xxx',
  501,
  NULL,     -- unlimited
  9500,
  8,
  5
);
```

---

### Task 3: ลบ Tier

**⚠️ ระวัง:** ลบ tier อาจทำให้ bookings เก่า orphaned!

**ขั้นตอนปลอดภัย:**

```sql
-- 1. เช็คว่ามี bookings ใช้ tier นี้หรือไม่
SELECT COUNT(*) FROM bookings b
WHERE b.package_v2_id = 'xxx'
  AND b.area_sqm >= 201
  AND b.area_sqm <= 300;

-- 2. ถ้ามี bookings → อย่าลบ! ให้ทำ soft delete แทน
-- (เพิ่ม column is_deleted ใน tiers table)

-- 3. ถ้าไม่มี bookings → ลบได้
DELETE FROM service_packages_v2_tiers
WHERE package_id = 'xxx'
  AND min_area_sqm = 201
  AND max_area_sqm = 300;
```

---

### Task 4: ปิดการใช้งาน Package (Deactivate)

**แทนที่จะลบ package → ให้ deactivate แทน:**

```sql
UPDATE service_packages_v2
SET
  is_active = false,
  updated_at = NOW()
WHERE id = 'xxx';
```

**ผลลัพธ์:**
- Package ไม่แสดงใน dropdown สำหรับ bookings ใหม่
- Bookings เก่ายังดูได้ปกติ
- สามารถ reactivate ได้ภายหลัง

---

### Task 5: Recalculate Prices (Pending Bookings)

**สถานการณ์:** แก้ไขราคา tier แล้วต้องการ update pending bookings

```sql
-- 1. Dry-run (ดูว่าจะเปลี่ยนอะไรบ้าง)
SELECT * FROM recalculate_v2_booking_prices();

-- Output:
-- booking_id | old_price | new_price | price_difference | action_taken
-- -----------+-----------+-----------+------------------+--------------
-- abc-123    | 3900      | 4200      | 300              | Would update

-- 2. ถ้า OK → Apply changes
SELECT * FROM apply_v2_booking_price_updates();

-- Output:
-- booking_id | old_price | new_price | updated_at
-- -----------+-----------+-----------+---------------------
-- abc-123    | 3900      | 4200      | 2025-01-11 14:30:00
```

**⚠️ คำเตือน:**
- Function นี้ update เฉพาะ **pending bookings** เท่านั้น
- Confirmed/Completed bookings ไม่ถูก update
- ควร backup database ก่อนรัน apply function

---

## 7. Troubleshooting

### Problem 1: Booking ไม่ match tier

**อาการ:**
```
Error: No matching tier found for 250 sqm
```

**สาเหตน:**
- Area 250 sqm ตกในช่องว่าง (gap) ระหว่าง tiers
- หรือไม่มี tier ครอบคลุมช่วงนี้

**วิธีแก้:**
1. รัน coverage validation query (Section 4)
2. หา gap
3. แก้ไข tiers ให้ครอบคลุม area 250

---

### Problem 2: End Time คำนวณผิด

**อาการ:**
- Start: 10:00
- Estimated Hours: 4
- End Time แสดง: 12:00 (ผิด - ควรเป็น 14:00)

**สาเหตน:**
- Bug ใน Phase 4 (แก้ไขแล้วใน Phase 5)
- estimated_hours ใน tier ไม่ถูกต้อง

**วิธีแก้:**
1. เช็คว่าใช้ version 2.0+ หรือไม่
2. Verify estimated_hours ใน tier:
```sql
SELECT * FROM service_packages_v2_tiers
WHERE package_id = 'xxx';
```
3. แก้ไข estimated_hours ถ้าผิด

---

### Problem 3: Service Name แสดง "N/A"

**อาการ:**
- Booking ใน Customer Profile แสดง service เป็น "N/A"
- หรือ Teams page แสดง "Unknown Service"

**สาเหตน:**
- Query ไม่ได้ join กับ service_packages_v2 table
- Bug ใน Phase 4 (แก้ไขแล้วใน Phase 5)

**วิธีแก้:**
1. Verify version 2.0+
2. เช็คว่า query มี:
```sql
service_packages_v2:package_v2_id (name, service_type)
```
3. Merge V1/V2 data ใน transform

---

### Problem 4: Duplicate Tiers

**อาการ:**
- พื้นที่ 150 sqm match 2 tiers พร้อมกัน

**สาเหตน:**
- Tiers ทับซ้อนกัน (overlapping ranges)

**ตัวอย่าง:**
```
Tier 2: 101-200
Tier 3: 150-300  ← ทับซ้อน!
```

**วิธีแก้:**
```sql
-- 1. หา overlapping tiers
SELECT
  t1.id as tier1_id,
  t1.min_area_sqm as t1_min,
  t1.max_area_sqm as t1_max,
  t2.id as tier2_id,
  t2.min_area_sqm as t2_min,
  t2.max_area_sqm as t2_max
FROM service_packages_v2_tiers t1
JOIN service_packages_v2_tiers t2
  ON t1.package_id = t2.package_id
  AND t1.id != t2.id
WHERE t1.max_area_sqm >= t2.min_area_sqm
  AND t1.min_area_sqm <= t2.max_area_sqm;

-- 2. แก้ไข tier ranges ให้ไม่ทับ
UPDATE service_packages_v2_tiers
SET max_area_sqm = 200
WHERE id = 'tier2-id';

UPDATE service_packages_v2_tiers
SET min_area_sqm = 201
WHERE id = 'tier3-id';
```

---

## 8. Best Practices

### ✅ DO

1. **วางแผน Tier Coverage ก่อน**
   - วาดแผนภาพ tier ranges บนกระดาษ
   - ตรวจสอบว่าไม่มี gaps
   - ทดสอบกับ area values จริง

2. **ใช้ Validation Queries เป็นประจำ**
   - รัน validation หลังสร้าง/แก้ไข tiers
   - เช็ค orphaned bookings อย่างสม่ำเสมอ

3. **Backup ก่อนแก้ไขข้อมูล**
   - Export database ก่อน UPDATE/DELETE
   - Test บน development environment ก่อน

4. **Document Changes**
   - บันทึกการเปลี่ยนแปลงราคา
   - เก็บ history ของ tier modifications

5. **Use Soft Deletes**
   - เพิ่ม is_deleted column แทนการ DELETE
   - รักษา referential integrity

### ❌ DON'T

1. **อย่าลบ Tiers ที่มี Bookings**
   - เช็ค bookings ก่อนลบเสมอ
   - ใช้ soft delete แทน

2. **อย่าสร้าง Overlapping Tiers**
   - ทำให้เกิดความสับสนในการ match
   - ระบบอาจเลือก tier แรกที่ match (ไม่ deterministic)

3. **อย่าแก้ไข Package ที่กำลังใช้งาน**
   - Deactivate ก่อน → แก้ไข → Reactivate
   - หรือสร้าง package ใหม่แทน

4. **อย่า Hard-code Package IDs**
   - ใช้ชื่อหรือ service_type ใน queries
   - Package IDs เป็น UUIDs (เปลี่ยนได้)

5. **อย่า Update Production ตรงๆ**
   - Test บน dev/staging ก่อน
   - ใช้ migration scripts

---

## 📊 Monitoring & Analytics

### Key Metrics to Track

```sql
-- 1. V2 Adoption Rate
SELECT
  COUNT(*) FILTER (WHERE package_v2_id IS NOT NULL)::float / COUNT(*) * 100 as v2_adoption_pct
FROM bookings
WHERE created_at >= NOW() - INTERVAL '30 days';

-- 2. Average Price by Tier
SELECT
  sp.name,
  t.min_area_sqm || '-' || COALESCE(t.max_area_sqm::text, '∞') as tier_range,
  AVG(b.total_price) as avg_price,
  COUNT(b.id) as booking_count
FROM bookings b
JOIN service_packages_v2 sp ON b.package_v2_id = sp.id
JOIN service_packages_v2_tiers t ON (
  t.package_id = sp.id
  AND b.area_sqm >= t.min_area_sqm
  AND (t.max_area_sqm IS NULL OR b.area_sqm <= t.max_area_sqm)
)
GROUP BY sp.name, t.min_area_sqm, t.max_area_sqm
ORDER BY sp.name, t.min_area_sqm;

-- 3. Most Popular Tiers
SELECT
  t.min_area_sqm || '-' || COALESCE(t.max_area_sqm::text, '∞') as tier_range,
  COUNT(b.id) as bookings
FROM bookings b
JOIN service_packages_v2_tiers t ON (
  t.package_id = b.package_v2_id
  AND b.area_sqm >= t.min_area_sqm
  AND (t.max_area_sqm IS NULL OR b.area_sqm <= t.max_area_sqm)
)
GROUP BY t.min_area_sqm, t.max_area_sqm
ORDER BY bookings DESC;
```

---

## 📚 Additional Resources

- [User Guide - V2 Tiered Pricing](USER-GUIDE-V2-TIERED-PRICING.md)
- [Testing Checklist](TESTING-CHECKLIST.md)
- [Phase 5 Changelog](CHANGELOG-PHASE5-V2-SYSTEM-WIDE-INTEGRATION.md)
- [Migration Helper Script](supabase/migrations/20250111_v2_data_migration_helper.sql)

---

## 📞 Support

**Technical Issues:**
- 📧 dev@tinedy.com
- 💬 Slack: #crm-support

**Business Questions:**
- 📧 admin@tinedy.com

---

**เวอร์ชั่นเอกสาร:** 1.0
**สร้างโดย:** Tinedy Development Team
**วันที่:** 11 มกราคม 2025
**ภาษา:** ภาษาไทย + English (Technical Terms)
