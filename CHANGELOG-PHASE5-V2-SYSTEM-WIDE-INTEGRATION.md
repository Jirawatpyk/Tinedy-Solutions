# Phase 5: V2 Tiered Pricing - System-Wide Integration

**Date:** 2025-01-11
**Status:** ✅ Completed
**Version:** 1.0

---

## Overview

Phase 5 เสร็จสิ้นการ integrate V2 Tiered Pricing system เข้ากับทุกหน้าในระบบ CRM รวมถึงแก้ไขปัญหา critical bugs ที่พบระหว่างการทดสอบ

---

## Critical Bugs Fixed

### 🐛 Bug #1: End Time Calculation Error

**ปัญหา:**
- Booking ที่สร้างด้วย V2 package แสดง End Time ไม่ถูกต้อง
- ตัวอย่าง: Package 4 ชั่วโมง (10:00-14:00) แต่แสดงเป็น 10:00-12:00 (เพียง 2 ชั่วโมง)
- ผู้ใช้ยืนยันว่าแก้ไข `estimated_hours` เป็น 4.0 แล้วก่อนสร้าง booking

**สาเหตน:**
[BookingCreateModal.tsx:209-212](src/components/booking/BookingCreateModal.tsx#L209-L212) คำนวณ `estimatedHours` จาก `requiredStaff` แทนที่จะใช้ค่าจริงจาก tier:

```typescript
// ❌ เดิม (ผิด)
const estimatedHours = packageSelection.requiredStaff <= 2 ? 2
  : packageSelection.requiredStaff <= 4 ? 3 : 4
```

สำหรับ package ที่มี `requiredStaff = 2` และ `estimatedHours = 4` จะได้ผลลัพธ์เป็น 2 ชั่วโมง

**การแก้ไข:**

[BookingCreateModal.tsx:206-209](src/components/booking/BookingCreateModal.tsx#L206-L209)
```typescript
// ✅ ใหม่ (ถูกต้อง)
else if (packageSelection?.estimatedHours && createForm.formData.start_time) {
  // V2 tiered package - use estimated hours from tier
  calculatedEndTime = calculateEndTime(
    createForm.formData.start_time || '',
    packageSelection.estimatedHours * 60
  )
}
```

**ผลลัพธ์:** End Time คำนวณถูกต้องตามค่า `estimated_hours` จริงใน tier

---

### 🐛 Bug #2: V2 Bookings Not Displaying in Calendar & Weekly Schedule

**ปัญหา:**
- Booking ที่สร้างด้วย V2 package ไม่แสดงใน Calendar view และ Weekly Schedule
- แสดงใน Bookings list ได้ปกติ

**สาเหตน:**
- Query ใช้ `service_packages!inner` ซึ่งกรองเฉพาะ bookings ที่มี V1 package เท่านั้น
- ไม่ได้ join กับ `service_packages_v2` table

**การแก้ไข:**

**1. calendar.tsx** [Lines 178-218](src/pages/admin/calendar.tsx#L178-L218)
```typescript
// ลบ !inner constraint และเพิ่ม V2 join
service_packages (              // ลบ !inner
  name,
  service_type
),
service_packages_v2:package_v2_id (  // ✨ เพิ่ม
  name,
  service_type
)

// Merge V1 and V2 data
const transformedData = (data || []).map((booking: any) => {
  const servicePackages = booking.service_packages || booking.service_packages_v2
  return {
    ...booking,
    service_packages: Array.isArray(servicePackages)
      ? servicePackages[0]
      : servicePackages,
  }
})
```

**2. weekly-schedule.tsx** [Lines 204-260](src/pages/admin/weekly-schedule.tsx#L204-L260)
```typescript
// เพิ่ม V2 join
service_packages_v2:package_v2_id (name, service_type)

// Merge V1 and V2 data
const servicePackages = booking.service_packages || booking.service_packages_v2
```

**ผลลัพธ์:** V2 bookings แสดงถูกต้องใน Calendar และ Weekly Schedule

---

### 🐛 Bug #3: "N/A" or "Unknown Service" in Multiple Pages

**ปัญหา:**
- V2 bookings แสดงเป็น "N/A" หรือ "Unknown Service" ใน:
  - Customer Profile - Booking History
  - Teams Management - Recent Bookings
  - Dashboard - Service Statistics

**สาเหตน:**
Pages เหล่านี้ query เฉพาะ `service_packages` table (V1) ไม่ได้รวม V2

**การแก้ไข:**

ใช้ pattern เดียวกันทุกไฟล์:
1. เพิ่ม `service_packages_v2:package_v2_id (name, service_type)` ใน query
2. Merge data: `const servicePackages = booking.service_packages || booking.service_packages_v2`
3. Transform arrays เป็น single object

**Files Fixed:**

**1. customer-detail.tsx** [Lines 249-298](src/pages/customer-detail.tsx#L249-L298)
```typescript
// เพิ่ม V2 joins (2 queries ในไฟล์เดียวกัน)
service_v2:service_packages_v2!bookings_package_v2_id_fkey (
  name,
  service_type
),
service_packages_v2:package_v2_id (
  name,
  service_type
)

// Merge V1 and V2 data
const service = booking.service || booking.service_v2
const servicePackages = booking.service_packages || booking.service_packages_v2
```

**2. TeamRecentBookings.tsx** [Lines 38-62](src/components/teams/team-detail/TeamRecentBookings.tsx#L38-L62)
```typescript
// เพิ่ม V2 join
service_packages_v2:package_v2_id (name)

// Merge data
const processedData = (data || []).map((booking: any) => ({
  ...booking,
  service_packages: booking.service_packages || booking.service_packages_v2
}))
```

**3. dashboard.tsx** [Lines 409-426](src/pages/admin/dashboard.tsx#L409-L426)
```typescript
// เพิ่ม V2 join สำหรับ service statistics
.select('total_price, status, service_packages(name), service_packages_v2:package_v2_id(name)')

// Merge data ใน service count calculation
const servicePackage = booking.service_packages || booking.service_packages_v2
```

**4. reports.tsx** [Lines 80-134](src/pages/admin/reports.tsx#L80-L134)
```typescript
// เพิ่ม V2 fields และ join
package_v2_id,
service_packages_v2:package_v2_id (
  name,
  service_type
)

// Merge V1 and V2 data in transform
const servicePackages = booking.service_packages || booking.service_packages_v2
const transformedBookings = (data as SupabaseBooking[] || []).map((booking): BookingWithService => ({
  ...booking,
  service_packages: Array.isArray(servicePackages)
    ? servicePackages[0] || null
    : servicePackages
}))
```

**ผลลัพธ์:** ทุก page แสดงชื่อ service ถูกต้องสำหรับทั้ง V1 และ V2 bookings

---

## Files Modified Summary

| File | Lines | Changes | Purpose |
|------|-------|---------|---------|
| [BookingCreateModal.tsx](src/components/booking/BookingCreateModal.tsx) | 206-209, 237, 271 | Fixed end time calculation, removed debug logs | Critical bug fix |
| [calendar.tsx](src/pages/admin/calendar.tsx) | 178-218 | Added V2 join, removed !inner | Display V2 bookings |
| [weekly-schedule.tsx](src/pages/admin/weekly-schedule.tsx) | 204-260 | Added V2 join and merge logic | Display V2 bookings |
| [customer-detail.tsx](src/pages/customer-detail.tsx) | 249-298 | Added V2 joins (2 queries) | Show V2 in booking history |
| [TeamRecentBookings.tsx](src/components/teams/team-detail/TeamRecentBookings.tsx) | 38-62 | Added V2 join and merge | Show V2 in team bookings |
| [dashboard.tsx](src/pages/admin/dashboard.tsx) | 409-426 | Added V2 join for statistics | Include V2 in analytics |
| [reports.tsx](src/pages/admin/reports.tsx) | 80-134 | Added V2 join and transform | Include V2 in reports |
| [bookings.tsx](src/pages/admin/bookings.tsx) | 164-166, 702-748 | Removed debug logs | Code cleanup |
| [PackageSelector.tsx](src/components/service-packages/PackageSelector.tsx) | 109-130 | Removed debug logs | Code cleanup |

---

## Pattern Applied (Consistent Across All Files)

```typescript
// 1. Add V2 join in query
const { data, error } = await supabase
  .from('bookings')
  .select(`
    *,
    service_packages (name, service_type),
    service_packages_v2:package_v2_id (name, service_type)  // ✨ เพิ่ม
  `)

// 2. Merge V1 and V2 data in transform
const transformedData = (data || []).map((booking: any) => {
  // Merge V1 and V2 package data
  const servicePackages = booking.service_packages || booking.service_packages_v2

  return {
    ...booking,
    service_packages: Array.isArray(servicePackages)
      ? servicePackages[0]
      : servicePackages,
  }
})
```

---

## Database Constraints Validated

จากการตรวจสอบ [migration file](supabase/migrations/20250111_make_service_package_id_nullable.sql):

```sql
-- Constraint ensures either V1 or V2, not both
ALTER TABLE bookings
  ADD CONSTRAINT bookings_package_check
  CHECK (
    (service_package_id IS NOT NULL AND package_v2_id IS NULL) OR
    (service_package_id IS NULL AND package_v2_id IS NOT NULL)
  );
```

✅ Constraint ช่วยป้องกัน booking ที่มีทั้ง V1 และ V2 package พร้อมกัน

---

## Debug Logs Removed

ลบ debug console.log ทั้งหมดที่เพิ่มไว้ระหว่างการแก้ไข:

**bookings.tsx:**
- Line 164-166: useEffect tracking createPackageSelection
- Line 723: onClose log
- Line 727: onSuccess log
- Line 736: onOpenAvailabilityModal log
- Line 753: Availability Modal onClose log
- Line 759: Staff selected log
- Line 769: Team selected log

**BookingCreateModal.tsx:**
- Line 237-242: "🔍 DEBUG: Values before insert"
- Line 278-284: "✅ DEBUG: Booking saved to database"

**PackageSelector.tsx:**
- Line 110: "🔄 PackageSelector: Restore Effect"
- Line 113: "🔍 Searching for package"
- Line 117: "✅ Package found, restoring"
- Line 122: "📊 Restoring tiered inputs"
- Line 127: "❌ Package not found"
- Line 130: "🧹 Clearing selection"

---

## Phase 6: Data Migration Helper

สร้าง [migration helper script](supabase/migrations/20250111_v2_data_migration_helper.sql) สำหรับ:

### Part 1: Verification Queries
- ตรวจสอบจำนวน bookings (V1 vs V2)
- List V2 packages และจำนวน tiers
- ตรวจสอบ V2 bookings ที่ขาด required data
- แสดง tier matches สำหรับแต่ละ booking

### Part 2: Data Cleanup Functions
- แก้ไข bookings ที่มีทั้ง V1 และ V2 (violation)
- List bookings ที่ไม่มี package เลย

### Part 3: Migration Helper Functions
```sql
-- Dry-run: ดูว่า price จะเปลี่ยนอย่างไร
SELECT * FROM recalculate_v2_booking_prices();

-- Apply updates (pending bookings only)
SELECT * FROM apply_v2_booking_price_updates();
```

### Part 4: Validation Queries
- ตรวจสอบ orphaned bookings (bookings ที่ไม่มี tier match)
- ตรวจสอบ tier coverage gaps

**คำเตือน:**
⚠️ Functions ใน Part 2-3 จะแก้ไขข้อมูล - ต้อง backup database ก่อนใช้งาน

---

## Testing Checklist

### End Time Calculation
- [x] V2 booking with 2-hour tier → End time = start + 2 hours
- [x] V2 booking with 4-hour tier → End time = start + 4 hours
- [x] Edit tier estimated_hours → New bookings use new duration
- [x] Console logs removed

### Display in All Pages
- [x] Calendar view shows V2 bookings
- [x] Weekly Schedule shows V2 bookings with service name
- [x] Customer Profile - Booking History shows V2 service name
- [x] Teams Management - Recent Bookings shows V2 service name
- [x] Dashboard - Service Statistics includes V2 bookings
- [x] Reports page includes V2 bookings in analytics

### Package Selection Persistence
- [x] Select Package → Check Staff → Back → Package still selected
- [x] Select Package → Check Staff → Select Team → Back → Package still selected
- [x] Create Success → Open new modal → Package cleared
- [x] Edit booking → Select Package → Check Staff → Back → Package persists

### Data Integrity
- [x] Cannot create booking with both V1 and V2 package
- [x] V2 bookings require area_sqm and frequency
- [x] V2 bookings calculate correct price from tiers
- [x] V1 bookings still work normally

---

## System-Wide V2 Support Status

| Feature/Page | V1 Support | V2 Support | Status |
|--------------|------------|------------|--------|
| Booking Creation | ✅ | ✅ | Complete |
| Booking Edit | ✅ | ✅ | Complete |
| Bookings List | ✅ | ✅ | Complete |
| Calendar View | ✅ | ✅ | Complete |
| Weekly Schedule | ✅ | ✅ | Complete |
| Customer Profile | ✅ | ✅ | Complete |
| Teams Management | ✅ | ✅ | Complete |
| Dashboard | ✅ | ✅ | Complete |
| Reports | ✅ | ✅ | Complete |
| Staff Availability | ✅ | ✅ | Complete |

---

## Benefits Achieved

✅ **Unified System** - V1 และ V2 packages ทำงานร่วมกันได้อย่างราบรื่น
✅ **Correct Calculations** - End time และ price คำนวณถูกต้อง
✅ **Complete Visibility** - V2 bookings แสดงครบทุก page
✅ **Data Integrity** - Database constraints ป้องกันข้อมูลผิดพลาด
✅ **Clean Code** - ลบ debug logs และใช้ consistent patterns
✅ **Migration Tools** - มี helper scripts สำหรับ data validation และ migration

---

## React Patterns Used

### 1. Lifting State Up
Package selection state ถูก lift ขึ้นไปที่ parent component (bookings.tsx) เพื่อให้ persist ข้าะ modal open/close

### 2. Consistent Data Transformation
ใช้ pattern เดียวกันทุกไฟล์สำหรับ merge V1/V2 data:
```typescript
const servicePackages = booking.service_packages || booking.service_packages_v2
```

### 3. Type Safety
ทุก transform มี TypeScript types ชัดเจน พร้อม interface definitions

---

## Next Steps

### Phase 7: Testing & Validation (Pending)
- [ ] Comprehensive E2E testing
- [ ] Load testing with mixed V1/V2 data
- [ ] User acceptance testing
- [ ] Performance testing

### Phase 8: Documentation & Deployment (Pending)
- [ ] User documentation
- [ ] Admin guide for V2 packages
- [ ] Deployment runbook
- [ ] Training materials

---

## Related Documents

- [Package Selection Persistence Fix](CHANGELOG-FIX-PACKAGE-SELECTION-PERSIST.md) - Lifting State Up pattern
- [V2 Data Migration Helper](supabase/migrations/20250111_v2_data_migration_helper.sql) - Migration scripts
- [Make Package ID Nullable](supabase/migrations/20250111_make_service_package_id_nullable.sql) - Database constraints

---

**Phase 5 Status:** ✅ **COMPLETE**
**Author:** Claude Code
**Version:** 1.0
**Date:** 2025-01-11
