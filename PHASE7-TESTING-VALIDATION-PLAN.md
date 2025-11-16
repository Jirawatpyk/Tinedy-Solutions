# Phase 7: Testing & Validation Plan
# V2 Tiered Pricing System

**Date:** 2025-01-11
**Version:** 1.0
**Status:** 🔄 In Progress

---

## Overview

Phase 7 ครอบคลุมการทดสอบและ validate ระบบ V2 Tiered Pricing อย่างครบถ้วน เพื่อให้มั่นใจว่าระบบทำงานถูกต้องและพร้อม deploy

---

## Testing Strategy

### 1. Unit Testing (Component Level)
- ✅ **PackageSelector Component**
- ✅ **Tiered Pricing Calculator**
- ✅ **BookingCreateModal Logic**
- ✅ **Data Merge Functions**

### 2. Integration Testing
- ✅ **V1 + V2 Package Coexistence**
- ✅ **Database Queries (All Pages)**
- ✅ **Realtime Subscriptions**
- ✅ **Staff Availability Check**

### 3. End-to-End Testing
- 🔄 **Complete Booking Flow**
- 🔄 **Multi-Page Navigation**
- 🔄 **User Workflows**

### 4. Regression Testing
- 🔄 **V1 Package Functionality**
- 🔄 **Existing Features**

### 5. Performance Testing
- ⏳ **Query Performance**
- ⏳ **Large Dataset Handling**

---

## Test Scenarios

## 📋 Scenario 1: V2 Package Booking Creation (Full Flow)

**Objective:** ทดสอบการสร้าง booking ด้วย V2 tiered package ตั้งแต่ต้นจนจบ

### Pre-conditions:
- มี V2 package ที่มีอย่างน้อย 2-3 tiers
- มี staff/team พร้อมให้บริการ
- Database มี tier data ครบถ้วน

### Test Steps:

#### Step 1: Open Create Booking Modal
1. ไปที่หน้า Bookings
2. กด "New Booking" button
3. **Expected:** Modal เปิดขึ้นมา แสดงฟอร์มว่าง

#### Step 2: Fill Customer Information
1. เลือก "New Customer"
2. กรอก: Full Name, Email, Phone
3. **Expected:** ไม่มี validation error

#### Step 3: Select V2 Service Package
1. เลือก Service Type (เช่น "Cleaning")
2. เลือก V2 Package จาก dropdown
3. **Expected:**
   - แสดง Package Card พร้อม Tiered Pricing indicator
   - แสดงฟิลด์ Area (sqm) และ Frequency

#### Step 4: Enter Tiered Pricing Inputs
1. กรอก Area: 150 sqm
2. เลือก Frequency: 1 time
3. กด "Calculate Price"
4. **Expected:**
   - แสดง Loading state
   - แสดงผลลัพธ์:
     - ✅ Matched Tier: "101-200 sqm"
     - ✅ Price: 3,900 THB
     - ✅ Estimated Hours: 4 hours
     - ✅ Required Staff: 2 people
   - Auto-fill Total Price = 3,900

#### Step 5: Fill Booking Details
1. เลือก Booking Date (อนาคต)
2. เลือก Start Time (เช่น 10:00)
3. **Expected:**
   - End Time auto-calculated = 14:00 (10:00 + 4 hours)
   - End Time (Optional) field shows calculated value

#### Step 6: Check Staff Availability
1. เลือก Assignment Type: "Team"
2. กด "Check Staff Availability"
3. **Expected:**
   - Create Modal ปิด
   - Staff Availability Modal เปิด
   - แสดง Teams พร้อม availability status
   - แสดง skill match score

#### Step 7: Select Team
1. เลือก Team ที่ Available
2. กด Select button
3. **Expected:**
   - Availability Modal ปิด
   - Create Modal เปิดกลับมา
   - **Package selection ยังคงอยู่** (3,900 THB, 150 sqm, 1x)
   - Team แสดงใน Assignment section

#### Step 8: Fill Address
1. กรอก Address, City, State, Zip Code
2. (Optional) เพิ่ม Notes
3. **Expected:** ฟอร์มครบถ้วน พร้อม submit

#### Step 9: Submit Booking
1. กด "Create Booking" button
2. **Expected:**
   - แสดง Loading state
   - Success toast แสดง
   - Modal ปิดอัตโนมัติ
   - **Booking ปรากฏใน list ทันที** (realtime)

#### Step 10: Verify Booking in List
1. ตรวจสอบ booking ที่สร้างใน Bookings list
2. **Expected:**
   - Status: Pending
   - Service Package: [V2 Package Name]
   - Total Price: 3,900 THB
   - Date & Time: ตรงตามที่กรอก
   - Start-End Time: 10:00-14:00
   - Team: [Selected Team Name]

#### Step 11: Verify in Calendar View
1. ไปที่หน้า Calendar
2. ไปที่วันที่ booking
3. **Expected:**
   - Booking แสดงใน Calendar
   - แสดง Customer Name
   - แสดง Service Package Name (V2)
   - แสดง Time: 10:00-14:00

#### Step 12: Verify in Weekly Schedule
1. ไปที่หน้า Weekly Schedule
2. เลือก Team ที่ assigned
3. ไปที่สัปดาห์ที่มี booking
4. **Expected:**
   - Booking แสดงใน Weekly Schedule
   - แสดงใน slot วันที่และเวลาที่ถูกต้อง
   - แสดง Service Name (V2)

#### Step 13: Verify in Team Detail
1. ไปที่ Teams Management
2. เลือก Team ที่ assigned
3. ดูที่ Recent Bookings section
4. **Expected:**
   - Booking แสดงใน Recent Bookings
   - แสดง Service Name: [V2 Package Name] (ไม่ใช่ "Unknown Service")
   - แสดง Price: 3,900 THB

#### Step 14: Verify in Customer Profile
1. ไปที่ Customers
2. ค้นหา customer ที่สร้าง
3. เข้าไปดู Customer Detail
4. ดู Booking History
5. **Expected:**
   - Booking แสดงใน History
   - Service: [V2 Package Name] (ไม่ใช่ "N/A")
   - Status, Date, Price ถูกต้อง

### Post-conditions:
- Booking สร้างสำเร็จใน database
- ข้อมูล V2 fields ถูกบันทึก:
  - package_v2_id: [UUID]
  - area_sqm: 150
  - frequency: 1
  - calculated_price: 3900
  - service_package_id: NULL
- end_time = start_time + estimated_hours
- Booking แสดงถูกต้องทุกหน้า

### Pass Criteria:
- ✅ ทุก step ผ่านโดยไม่มี error
- ✅ Package selection persist หลัง modal reopen
- ✅ End time คำนวณถูกต้อง
- ✅ Booking แสดงครบทุกหน้า (7 pages)
- ✅ Service name แสดงถูกต้อง (ไม่ใช่ N/A หรือ Unknown)

---

## 📋 Scenario 2: Edit V2 Booking

**Objective:** ทดสอบการแก้ไข booking ที่มี V2 package

### Test Steps:

#### Step 1: Open Edit Modal
1. ในหน้า Bookings list
2. Click บน booking ที่สร้างจาก Scenario 1
3. กด "Edit" button
4. **Expected:**
   - Edit Modal เปิด
   - แสดงข้อมูล booking เดิม
   - Package selection แสดง: 3,900 THB (150 sqm, 1x)

#### Step 2: Change Area
1. เปลี่ยน Area จาก 150 → 250 sqm
2. กด "Calculate Price"
3. **Expected:**
   - Matched Tier เปลี่ยนเป็น "201-300 sqm"
   - Price เปลี่ยนเป็น 5,400 THB
   - Estimated Hours อาจเปลี่ยน (เช่น 5-6 hours)
   - Required Staff อาจเปลี่ยน (เช่น 3 people)
   - Total Price auto-update = 5,400

#### Step 3: Update End Time
1. สังเกต End Time auto-recalculate
2. **Expected:**
   - ถ้า Estimated Hours = 6
   - Start Time = 10:00
   - End Time = 16:00 (10:00 + 6 hours)

#### Step 4: Check Staff Availability (Optional)
1. กด "Check Staff Availability"
2. **Expected:**
   - Modal รู้ว่าต้อง 3 people (จาก tier)
   - แสดง Teams ที่มีคนครบ 3+ คน
   - Filter teams ที่คนไม่ครบ

#### Step 5: Update Booking
1. กด "Update Booking"
2. **Expected:**
   - Success toast
   - Modal ปิด
   - Booking ใน list อัพเดททันที (realtime)
   - Price: 5,400 THB
   - Time: 10:00-16:00

#### Step 6: Verify Update in Database
1. เปิด Supabase Dashboard
2. เช็ค bookings table
3. **Expected:**
   - area_sqm: 250
   - calculated_price: 5400
   - total_price: 5400
   - end_time: 16:00:00

### Pass Criteria:
- ✅ แก้ไข Area → Price recalculate ถูกต้อง
- ✅ End Time recalculate ถูกต้อง
- ✅ Required Staff update ถูกต้อง
- ✅ Update สำเร็จใน database
- ✅ Realtime update ใน UI

---

## 📋 Scenario 3: V1 Package Still Works (Regression)

**Objective:** ยืนยันว่า V1 packages ยังทำงานปกติหลังเพิ่ม V2

### Test Steps:

#### Step 1: Create V1 Booking
1. เปิด Create Booking Modal
2. กรอก Customer info
3. เลือก V1 Package (Fixed Price)
4. **Expected:**
   - ไม่แสดงฟิลด์ Area/Frequency
   - แสดง Price คงที่
   - ไม่มี "Calculate Price" button

#### Step 2: Complete V1 Booking
1. กรอก Date, Time, Address
2. Select Staff/Team
3. Submit
4. **Expected:**
   - Booking สร้างสำเร็จ
   - service_package_id: [UUID]
   - package_v2_id: NULL
   - area_sqm: NULL
   - frequency: NULL

#### Step 3: Verify V1 in All Pages
1. เช็ค Bookings List
2. เช็ค Calendar
3. เช็ค Weekly Schedule
4. เช็ค Customer Profile
5. เช็ค Team Detail
6. **Expected:**
   - V1 booking แสดงถูกต้องทุกหน้า
   - Service name แสดงจาก service_packages table
   - ไม่มี error หรือ "N/A"

### Pass Criteria:
- ✅ V1 booking ทำงานปกติ
- ✅ ไม่มี regression bugs
- ✅ V1 และ V2 แสดงร่วมกันได้ใน list

---

## 📋 Scenario 4: Mixed V1/V2 in Reports & Analytics

**Objective:** ทดสอบว่า Reports และ Dashboard รวม V1+V2 ได้ถูกต้อง

### Test Steps:

#### Step 1: Check Dashboard Statistics
1. ไปที่ Dashboard
2. ดูที่ Mini Cards (Service Count)
3. **Expected:**
   - นับรวมทั้ง V1 และ V2 bookings
   - แสดง Service Names ถูกต้อง
   - Top Services รวมทั้ง V1 และ V2

#### Step 2: Check Revenue Chart
1. ดู Revenue Chart (Line/Bar)
2. **Expected:**
   - Revenue รวมจาก V1 และ V2 bookings
   - ไม่มี bookings หาย

#### Step 3: Check Reports Page
1. ไปที่ Reports
2. ดู Bookings Over Time chart
3. **Expected:**
   - นับรวมทั้ง V1 และ V2
   - กราฟแสดงข้อมูลครบถ้วน

#### Step 4: Filter by Service
1. ใช้ Service Filter ใน Reports
2. เลือกเฉพาะ V2 package
3. **Expected:**
   - แสดงเฉพาะ V2 bookings
   - Chart update ถูกต้อง

### Pass Criteria:
- ✅ Analytics รวม V1+V2 ถูกต้อง
- ✅ Revenue calculation ถูกต้อง
- ✅ Filters ทำงานได้กับทั้ง V1 และ V2

---

## 📋 Scenario 5: Edge Cases & Error Handling

### Test Case 5.1: No Matching Tier
1. สร้าง V2 Package ที่มี tier: 0-100 sqm, 101-200 sqm
2. พยายาม book ด้วย Area: 300 sqm
3. **Expected:**
   - แสดง error: "No matching tier found for 300 sqm"
   - ไม่ให้ submit booking

### Test Case 5.2: Invalid Area Input
1. กรอก Area: -50 หรือ 0
2. **Expected:**
   - Validation error: "Area must be greater than 0"

### Test Case 5.3: Missing Tiered Data
1. เลือก V2 Package
2. ไม่กรอก Area หรือ Frequency
3. พยายาม submit
4. **Expected:**
   - Validation error: "Area and Frequency are required"

### Test Case 5.4: Package Selection Cleared on Success
1. สร้าง booking สำเร็จ
2. เปิด Create Modal ใหม่
3. **Expected:**
   - Package selection ว่างเปล่า
   - createPackageSelection = null

### Test Case 5.5: Booking with Both V1 and V2 (Database Constraint)
1. พยายาม insert booking ที่มี:
   - service_package_id: [UUID]
   - package_v2_id: [UUID]
2. **Expected:**
   - Database constraint error
   - Booking ไม่ถูกสร้าง

### Pass Criteria:
- ✅ ทุก edge case แสดง error ที่เหมาะสม
- ✅ ไม่มี crash หรือ unhandled errors
- ✅ User ได้รับ feedback ชัดเจน

---

## 📋 Scenario 6: Performance Testing

### Test Case 6.1: Large Dataset Query
1. สร้าง 100+ bookings (mixed V1/V2)
2. เปิดหน้า Bookings List
3. **Measure:**
   - Query time < 2 seconds
   - Page render time < 3 seconds

### Test Case 6.2: Calendar with Many Bookings
1. สร้าง 50+ bookings ในเดือนเดียวกัน
2. เปิด Calendar view
3. **Measure:**
   - Query time < 2 seconds
   - Calendar render smooth (no lag)

### Test Case 6.3: Reports with Date Range
1. Query bookings ย้อนหลัง 1 ปี
2. Generate charts
3. **Measure:**
   - Query time < 3 seconds
   - Charts render < 2 seconds

### Pass Criteria:
- ✅ Query performance ต่ำกว่า threshold
- ✅ UI responsive (ไม่ค้าง)
- ✅ No memory leaks

---

## Manual Testing Checklist

### 🔲 Booking Creation (V2)
- [ ] Select V2 package
- [ ] Enter area & frequency
- [ ] Calculate price
- [ ] Price matches tier
- [ ] End time auto-calculated
- [ ] Check staff availability
- [ ] Package selection persists
- [ ] Submit successful
- [ ] Booking appears in list (realtime)

### 🔲 Booking Edit (V2)
- [ ] Open edit modal
- [ ] Package data loaded
- [ ] Change area
- [ ] Price recalculates
- [ ] End time recalculates
- [ ] Update successful
- [ ] Realtime update in list

### 🔲 Display Verification (All Pages)
- [ ] Bookings List - V2 shows service name
- [ ] Calendar - V2 booking appears
- [ ] Weekly Schedule - V2 shows correctly
- [ ] Customer Profile - V2 in booking history (not "N/A")
- [ ] Team Detail - V2 in recent bookings (not "Unknown")
- [ ] Dashboard - V2 included in statistics
- [ ] Reports - V2 included in analytics

### 🔲 V1 Regression
- [ ] Create V1 booking
- [ ] V1 booking works normally
- [ ] V1 displays in all pages
- [ ] Mixed V1/V2 in same list works

### 🔲 Edge Cases
- [ ] No matching tier → Error message
- [ ] Invalid area (negative/zero) → Validation
- [ ] Missing tiered data → Validation
- [ ] Package cleared after success
- [ ] Database constraint prevents V1+V2 both

### 🔲 Database Validation
- [ ] Run migration helper verification queries
- [ ] No orphaned V2 bookings
- [ ] No tier coverage gaps
- [ ] Constraint violations = 0

---

## Automated Testing (Future)

### Unit Tests (Vitest + Testing Library)
```typescript
// Example test structure
describe('PackageSelector', () => {
  it('should calculate price from tier', async () => {
    // Test tier matching logic
  })

  it('should restore selection from value prop', () => {
    // Test persistence
  })
})

describe('End Time Calculator', () => {
  it('should calculate correct end time from estimated hours', () => {
    // Test time calculation
  })
})
```

### E2E Tests (Playwright/Cypress)
```typescript
// Example E2E test
test('Create V2 Booking Full Flow', async ({ page }) => {
  await page.goto('/admin/bookings')
  await page.click('text=New Booking')
  // ... full flow
  await expect(page.locator('.booking-list')).toContainText('3,900')
})
```

---

## Test Environment Setup

### Prerequisites:
1. ✅ Development database with sample data
2. ✅ At least 2-3 V2 packages with multiple tiers
3. ✅ Staff/Teams configured
4. ✅ Customer records
5. ✅ Mix of V1 and V2 bookings

### Test Data:
```sql
-- V2 Package Example
INSERT INTO service_packages_v2 (name, service_type, pricing_model)
VALUES ('Premium Cleaning', 'Cleaning', 'tiered');

-- Tiers
INSERT INTO service_packages_v2_tiers
(package_id, min_area_sqm, max_area_sqm, price_per_time, estimated_hours, required_staff)
VALUES
  ('[package-id]', 0, 100, 2900, 3, 2),
  ('[package-id]', 101, 200, 3900, 4, 2),
  ('[package-id]', 201, 300, 5400, 5, 3);
```

---

## Bug Tracking Template

### Bug Report Format:
```markdown
## Bug ID: [PHASE7-XXX]

**Severity:** Critical / High / Medium / Low

**Component:** [Component Name]

**Description:**
Brief description of the bug

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
What should happen

**Actual Result:**
What actually happened

**Screenshots/Logs:**
[Attach if applicable]

**Environment:**
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/Mac/Linux]
- Database: [Supabase]

**Related Files:**
- [file.tsx:line]

**Priority:** P0 / P1 / P2 / P3
```

---

## Testing Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Manual Testing - Core Scenarios | 2-3 hours | 🔄 In Progress |
| Edge Case Testing | 1 hour | ⏳ Pending |
| Performance Testing | 1 hour | ⏳ Pending |
| Database Validation | 30 min | ⏳ Pending |
| Bug Fixes | Variable | ⏳ Pending |
| Regression Testing | 1 hour | ⏳ Pending |
| **Total** | **~6-8 hours** | |

---

## Sign-off Criteria

Phase 7 ถือว่าเสร็จสมบูรณ์เมื่อ:

- ✅ ทุก test scenario ใน checklist ผ่าน 100%
- ✅ ไม่มี Critical/High severity bugs
- ✅ V1 functionality ไม่มี regression
- ✅ V2 bookings แสดงถูกต้องทุกหน้า (7 pages)
- ✅ Database validation queries ผ่าน (0 errors)
- ✅ Performance metrics ผ่าน threshold
- ✅ Documentation updated พร้อม test results

---

## Next: Phase 8

หลัง Phase 7 เสร็จสมบูรณ์:
- 📝 User Documentation
- 📝 Admin Guide
- 🚀 Deployment Plan
- 📚 Training Materials

---

**Phase 7 Status:** 🔄 **Testing in Progress**
**Author:** Claude Code
**Version:** 1.0
**Date:** 2025-01-11
