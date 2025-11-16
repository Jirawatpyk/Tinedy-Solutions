# 📋 V2 Tiered Pricing - Manual Testing Checklist

**Tester:** _________________
**Date:** _________________
**Environment:** Development / Staging / Production
**Browser:** _________________

---

## ✅ Pre-Testing Setup

- [ ] Database มี V2 packages อย่างน้อย 2 packages
- [ ] V2 packages มี tiers อย่างน้อย 3 tiers
- [ ] มี Staff/Teams พร้อมให้ทดสอบ
- [ ] มี sample customers
- [ ] Browser console เปิดไว้ (เช็ค errors)

---

## 🧪 Test Suite 1: Create V2 Booking (Core Flow)

### 1.1 Open Create Modal
- [ ] กด "New Booking" → Modal เปิด
- [ ] ฟอร์มว่างเปล่า (ไม่มีข้อมูลเก่า)

### 1.2 Customer Information
- [ ] เลือก "New Customer"
- [ ] กรอก: Name, Email, Phone
- [ ] ไม่มี validation error

### 1.3 Select V2 Package
- [ ] เลือก Service Type: "Cleaning"
- [ ] เลือก V2 Package จาก dropdown
- [ ] Package Card แสดง "Tiered Pricing" badge
- [ ] แสดงฟิลด์: Area (sqm), Frequency

### 1.4 Calculate Tiered Price
- [ ] กรอก Area: **150** sqm
- [ ] Frequency: **1** time
- [ ] กด "Calculate Price"
- [ ] ✅ แสดง Loading spinner
- [ ] ✅ Matched Tier: **"101-200 sqm"** (ตัวอย่าง)
- [ ] ✅ Price: **3,900 THB** (ตัวอย่าง)
- [ ] ✅ Estimated Hours: **4** hours
- [ ] ✅ Required Staff: **2** people
- [ ] ✅ Total Price auto-fill: **3,900**

### 1.5 Booking Date & Time
- [ ] เลือก Booking Date (วันในอนาคต)
- [ ] Start Time: **10:00**
- [ ] ✅ **End Time auto-calculated: 14:00** (10:00 + 4 hours)
- [ ] End Time field shows calculated value

### 1.6 Check Staff Availability
- [ ] Assignment Type: "Team"
- [ ] กด "Check Staff Availability"
- [ ] ✅ Create Modal **ปิด**
- [ ] ✅ Availability Modal **เปิด**
- [ ] แสดง Teams พร้อม availability
- [ ] Skill match percentage แสดง

### 1.7 Select Team
- [ ] เลือก Team ที่ Available
- [ ] กด "Select"
- [ ] ✅ Availability Modal **ปิด**
- [ ] ✅ Create Modal **เปิดกลับมา**
- [ ] ✅ **Package selection ยังคงอยู่** (3,900 THB ยังแสดง)
- [ ] Team name แสดงใน Assignment section

### 1.8 Address & Submit
- [ ] กรอก: Address, City, State, Zip
- [ ] (Optional) เพิ่ม Notes
- [ ] กด "Create Booking"
- [ ] ✅ Success toast แสดง
- [ ] ✅ Modal ปิดอัตโนมัติ

### 1.9 Verify in Bookings List
- [ ] ✅ Booking แสดงทันที (realtime)
- [ ] Status: **Pending**
- [ ] Service: **[V2 Package Name]** (ไม่ใช่ N/A)
- [ ] Price: **3,900 THB**
- [ ] Time: **10:00-14:00**
- [ ] Team: **[Team Name]**

**Result:** ✅ Pass / ❌ Fail
**Notes:** _________________________________________________

---

## 🧪 Test Suite 2: Verify Display in All Pages

### 2.1 Calendar View
- [ ] ไปที่ Calendar
- [ ] ไปที่วันที่ booking
- [ ] ✅ Booking **แสดงใน Calendar**
- [ ] Customer Name แสดง
- [ ] Service Name: **[V2 Package]** (ไม่ใช่ N/A)
- [ ] Time: **10:00-14:00**

### 2.2 Weekly Schedule
- [ ] ไปที่ Weekly Schedule
- [ ] เลือก Team ที่ assigned
- [ ] ✅ Booking **แสดงใน schedule**
- [ ] วันที่และเวลาถูกต้อง
- [ ] Service Name: **[V2 Package]**

### 2.3 Customer Profile
- [ ] ไปที่ Customers
- [ ] เลือก customer ที่สร้าง
- [ ] ดู Booking History
- [ ] ✅ Booking แสดงใน History
- [ ] Service: **[V2 Package]** (ไม่ใช่ **"N/A"**)
- [ ] Status, Date, Price ถูกต้อง

### 2.4 Team Detail
- [ ] ไปที่ Teams Management
- [ ] เลือก Team ที่ assigned
- [ ] ดู Recent Bookings
- [ ] ✅ Booking แสดงใน list
- [ ] Service: **[V2 Package]** (ไม่ใช่ **"Unknown Service"**)
- [ ] Price: **3,900 THB**

### 2.5 Dashboard
- [ ] ไปที่ Dashboard
- [ ] ดู Service Statistics card
- [ ] ✅ V2 Package **นับรวมใน count**
- [ ] Service name แสดงใน top services

### 2.6 Reports
- [ ] ไปที่ Reports
- [ ] ดู Bookings Over Time chart
- [ ] ✅ V2 booking **นับรวมใน chart**
- [ ] Service filter มี V2 package

**Result:** ✅ Pass / ❌ Fail
**Notes:** _________________________________________________

---

## 🧪 Test Suite 3: Edit V2 Booking

### 3.1 Open Edit Modal
- [ ] Click บน booking ที่สร้างใน Test Suite 1
- [ ] กด "Edit"
- [ ] ✅ Edit Modal เปิด
- [ ] ข้อมูลเดิมแสดง:
  - [ ] Area: **150** sqm
  - [ ] Frequency: **1**
  - [ ] Price: **3,900** THB
  - [ ] Time: **10:00-14:00**

### 3.2 Change Tier
- [ ] เปลี่ยน Area: **150** → **250** sqm
- [ ] กด "Calculate Price"
- [ ] ✅ Tier เปลี่ยนเป็น: **"201-300 sqm"** (ตัวอย่าง)
- [ ] ✅ Price เปลี่ยนเป็น: **5,400 THB** (ตัวอย่าง)
- [ ] ✅ Estimated Hours เปลี่ยน (เช่น **5-6** hours)
- [ ] ✅ End Time recalculate: **15:00** หรือ **16:00**

### 3.3 Update Booking
- [ ] กด "Update Booking"
- [ ] ✅ Success toast
- [ ] ✅ Modal ปิด
- [ ] ✅ List **update ทันที** (realtime)
- [ ] Price: **5,400 THB**
- [ ] Time: **10:00-15:00** (or 16:00)

### 3.4 Verify Update in Database
- [ ] เปิด Supabase Dashboard
- [ ] ไปที่ bookings table
- [ ] หา booking นี้
- [ ] ✅ area_sqm: **250**
- [ ] ✅ calculated_price: **5400**
- [ ] ✅ total_price: **5400**
- [ ] ✅ end_time: **15:00:00** หรือ **16:00:00**

**Result:** ✅ Pass / ❌ Fail
**Notes:** _________________________________________________

---

## 🧪 Test Suite 4: V1 Package Regression

### 4.1 Create V1 Booking
- [ ] เปิด Create Booking Modal
- [ ] เลือก V1 Package (Fixed Price)
- [ ] ✅ **ไม่แสดง** Area/Frequency fields
- [ ] ✅ แสดง Price คงที่
- [ ] ✅ **ไม่มี** "Calculate Price" button

### 4.2 Complete V1 Flow
- [ ] กรอกข้อมูลครบถ้วน
- [ ] Submit booking
- [ ] ✅ Booking สร้างสำเร็จ
- [ ] ✅ แสดงใน Bookings list

### 4.3 Verify V1 in All Pages
- [ ] Bookings List - V1 แสดงถูกต้อง
- [ ] Calendar - V1 แสดง
- [ ] Weekly Schedule - V1 แสดง
- [ ] Customer Profile - V1 แสดง (ไม่ใช่ N/A)
- [ ] Team Detail - V1 แสดง (ไม่ใช่ Unknown)

### 4.4 Mixed V1/V2 Display
- [ ] ✅ V1 และ V2 bookings **แสดงร่วมกัน** ใน list
- [ ] แยกแยะได้ว่าอันไหนเป็น V1 หรือ V2
- [ ] ไม่มี confusion

**Result:** ✅ Pass / ❌ Fail
**Notes:** _________________________________________________

---

## 🧪 Test Suite 5: Edge Cases

### 5.1 No Matching Tier
- [ ] เลือก V2 Package ที่มี tier: 0-100, 101-200
- [ ] กรอก Area: **300** sqm (ไม่มี tier match)
- [ ] กด Calculate
- [ ] ✅ **Error message** แสดง: "No matching tier"
- [ ] ไม่สามารถ submit ได้

### 5.2 Invalid Area Input
- [ ] กรอก Area: **-50** หรือ **0**
- [ ] ✅ Validation error: "Area must be greater than 0"

### 5.3 Missing Tiered Data
- [ ] เลือก V2 Package
- [ ] **ไม่กรอก** Area หรือ Frequency
- [ ] พยายาม submit
- [ ] ✅ Validation error: "Area and Frequency required"

### 5.4 Package Cleared After Success
- [ ] สร้าง booking สำเร็จ
- [ ] เปิด Create Modal ใหม่
- [ ] ✅ Package selection **ว่างเปล่า**
- [ ] ไม่มีข้อมูลเก่าค้างอยู่

### 5.5 Staff Availability with V2
- [ ] เลือก V2 Package (Required Staff: 3)
- [ ] กด Check Availability
- [ ] ✅ แสดงเฉพาะ Teams ที่มีคนครบ 3+ คน
- [ ] Teams ที่คนไม่ครบ mark เป็น unavailable

**Result:** ✅ Pass / ❌ Fail
**Notes:** _________________________________________________

---

## 🧪 Test Suite 6: Package Selection Persistence

### 6.1 Basic Persistence
- [ ] เลือก V2 Package → Calculate Price
- [ ] กด Check Staff Availability
- [ ] Create Modal **ปิด**
- [ ] Availability Modal **เปิด**
- [ ] กด "Back" หรือ Close
- [ ] Create Modal **เปิดกลับมา**
- [ ] ✅ **Package selection ยังคงอยู่** (Price, Area, Frequency)

### 6.2 After Staff Selection
- [ ] เลือก Package → Check Availability
- [ ] เลือก Staff
- [ ] กลับมา Create Modal
- [ ] ✅ Package selection **ยังคงอยู่**
- [ ] Staff assigned แสดง

### 6.3 After Team Selection
- [ ] เลือก Package → Check Availability
- [ ] เลือก Team
- [ ] กลับมา Create Modal
- [ ] ✅ Package selection **ยังคงอยู่**
- [ ] Team assigned แสดง

**Result:** ✅ Pass / ❌ Fail
**Notes:** _________________________________________________

---

## 🧪 Test Suite 7: Console & Error Checking

### 7.1 Console Logs
- [ ] เปิด Browser DevTools Console
- [ ] ทำ Test Suite 1-6 ทั้งหมด
- [ ] ✅ **ไม่มี** console.log ที่เป็น debug (🔍, 📦, ✅, etc.)
- [ ] ✅ **ไม่มี** errors สีแดง
- [ ] ✅ **ไม่มี** warnings สีเหลือง (หรือมีแต่ไม่สำคัญ)

### 7.2 Network Requests
- [ ] เปิด Network tab
- [ ] สร้าง booking
- [ ] ✅ Queries ไม่ fail (status 200)
- [ ] ✅ Response time < 2 seconds

**Result:** ✅ Pass / ❌ Fail
**Notes:** _________________________________________________

---

## 🧪 Test Suite 8: Database Validation (Optional)

### 8.1 Run Verification Queries
```sql
-- 1. Check bookings distribution
SELECT
  'V1 Packages' as type, COUNT(*) FROM bookings
  WHERE service_package_id IS NOT NULL AND package_v2_id IS NULL
UNION ALL
SELECT 'V2 Packages', COUNT(*) FROM bookings
  WHERE package_v2_id IS NOT NULL AND service_package_id IS NULL;
```
- [ ] Query รันสำเร็จ
- [ ] แสดงจำนวน V1 และ V2 bookings

### 8.2 Check Orphaned Bookings
```sql
-- V2 bookings without matching tiers
SELECT COUNT(*) as orphaned
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
- [ ] Query รันสำเร็จ
- [ ] ✅ Result: **0** (no orphaned bookings)

### 8.3 Check Constraint Violations
```sql
-- Bookings with both V1 and V2 (should be 0)
SELECT COUNT(*) FROM bookings
WHERE service_package_id IS NOT NULL
  AND package_v2_id IS NOT NULL;
```
- [ ] Query รันสำเร็จ
- [ ] ✅ Result: **0** (no violations)

**Result:** ✅ Pass / ❌ Fail
**Notes:** _________________________________________________

---

## 📊 Test Summary

| Test Suite | Pass | Fail | Skipped | Notes |
|------------|------|------|---------|-------|
| 1. Create V2 Booking | ☐ | ☐ | ☐ | |
| 2. Display in All Pages | ☐ | ☐ | ☐ | |
| 3. Edit V2 Booking | ☐ | ☐ | ☐ | |
| 4. V1 Regression | ☐ | ☐ | ☐ | |
| 5. Edge Cases | ☐ | ☐ | ☐ | |
| 6. Package Persistence | ☐ | ☐ | ☐ | |
| 7. Console & Errors | ☐ | ☐ | ☐ | |
| 8. Database Validation | ☐ | ☐ | ☐ | |

**Overall Result:** ✅ All Pass / ⚠️ Some Issues / ❌ Critical Issues

---

## 🐛 Bugs Found

### Bug #1
- **Severity:** Critical / High / Medium / Low
- **Component:** _______________________
- **Description:** _______________________
- **Steps to Reproduce:** _______________________
- **Expected:** _______________________
- **Actual:** _______________________

### Bug #2
- **Severity:** Critical / High / Medium / Low
- **Component:** _______________________
- **Description:** _______________________

_(Add more as needed)_

---

## ✍️ Tester Sign-off

**Name:** _______________________
**Date:** _______________________
**Signature:** _______________________

**Recommendation:**
- [ ] ✅ Ready for Production
- [ ] ⚠️ Minor fixes needed (non-blocking)
- [ ] ❌ Major issues found (blocking)

**Comments:**
________________________________________________________________
________________________________________________________________
________________________________________________________________

---

## 📝 Notes for Developers

- ถ้ามี bugs ให้บันทึกใน Bug Tracking System
- Attach screenshots/videos ถ้าเป็นไปได้
- Reference ไปที่ [PHASE7-TESTING-VALIDATION-PLAN.md](PHASE7-TESTING-VALIDATION-PLAN.md) สำหรับ detailed scenarios

---

**Version:** 1.0
**Created:** 2025-01-11
**Last Updated:** 2025-01-11
