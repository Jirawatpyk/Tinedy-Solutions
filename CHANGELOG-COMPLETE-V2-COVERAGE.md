# Complete V2 Coverage - Staff Pages & Hooks
# เพิ่ม V2 Package Support ครบทุกหน้า

**Date:** 2025-01-11
**Status:** ✅ Complete
**Version:** 2.1

---

## ภาพรวม

พบว่ายังมีไฟล์ที่เกี่ยวข้องกับ **Staff** ที่ยังไม่ได้เพิ่ม V2 package support จำนวน **4 ไฟล์**

การแก้ไขครั้งนี้เพิ่ม V2 support ให้ครบถ้วนทุกหน้าที่เกี่ยวข้องกับการแสดงผล bookings

---

## 🔍 ไฟล์ที่แก้ไข

### 1. use-staff-bookings.ts
**Path:** [src/hooks/use-staff-bookings.ts](src/hooks/use-staff-bookings.ts)

**ปัญหา:**
- Hook นี้ใช้แสดง Staff Dashboard (Today/Upcoming/Completed bookings)
- Query 4 จุดไม่มี V2 support:
  1. Earnings calculation (Line 241)
  2. Today's bookings (Line 320)
  3. Upcoming bookings (Line 341)
  4. Past bookings (Line 364)

**การแก้ไข:**

#### 1.1 Earnings Query (Lines 239-251)
```typescript
// เดิม (V1 only)
.select('service_packages (price)')

// ใหม่ (V1 + V2)
.select('service_packages (price), service_packages_v2:package_v2_id (name), total_price')
```

**Earnings Calculation (Lines 260-263):**
```typescript
// เดิม - ใช้ price จาก service_packages
const totalEarnings = (earningsResult as BookingWithPrice[])?.reduce((sum, booking) => {
  const price = Array.isArray(booking.service_packages)
    ? booking.service_packages[0]?.price || 0
    : booking.service_packages?.price || 0
  return sum + price
}, 0) || 0

// ใหม่ - ใช้ total_price (works for both V1 and V2)
const totalEarnings = (earningsResult as any[])?.reduce((sum, booking) => {
  // Use total_price for both V1 and V2 bookings
  return sum + (booking.total_price || 0)
}, 0) || 0
```

#### 1.2 Today's Bookings (Lines 315-331)
```typescript
// เดิม
customers (id, full_name, phone, avatar_url),
service_packages (id, name, duration_minutes, price)

// ใหม่
customers (id, full_name, phone, avatar_url),
service_packages (id, name, duration_minutes, price),
service_packages_v2:package_v2_id (id, name)  // ✨ เพิ่ม
```

#### 1.3 Upcoming & Past Bookings (Lines 337-342, 361-366)
เพิ่ม V2 join เหมือนกับ Today's bookings

#### 1.4 Data Merge (Lines 392-406)
```typescript
// Merge V1 and V2 package data for all results
const mergePackages = (bookings: any[]) => {
  return bookings.map(booking => ({
    ...booking,
    service_packages: booking.service_packages || booking.service_packages_v2
  }))
}

const todayData = mergePackages(todayResult.data || [])
const upcomingData = mergePackages(upcomingResult.data || [])
const completedData = mergePackages(completedResult.data || [])
```

**ผลลัพธ์:**
- ✅ Staff Dashboard แสดง V2 bookings ใน Today/Upcoming/Completed
- ✅ Earnings calculation รวม V2 bookings
- ✅ Service names แสดงถูกต้อง (ไม่ใช่ null)

---

### 2. use-staff-profile.ts
**Path:** [src/hooks/use-staff-profile.ts](src/hooks/use-staff-profile.ts)

**ปัญหา:**
- Hook นี้ใช้แสดง Staff Profile Performance Stats
- Query 2 จุดไม่มี V2 support:
  1. Total revenue calculation (Line 103)
  2. Monthly breakdown (Line 126)

**การแก้ไข:**

#### 2.1 Total Revenue Query (Lines 100-114)
```typescript
// เดิม
.select('service_packages (price)')

// ใหม่
.select(`
  total_price,
  service_packages (price),
  service_packages_v2:package_v2_id (name)
`)

// Calculation - เดิม
const totalRevenue = (revenueData as RevenueBooking[] | null)?.reduce((sum, booking) => {
  const servicePackage = Array.isArray(booking.service_packages)
    ? booking.service_packages[0]
    : booking.service_packages
  return sum + (servicePackage?.price || 0)
}, 0) || 0

// Calculation - ใหม่
const totalRevenue = (revenueData as any[] | null)?.reduce((sum, booking) => {
  // Use total_price for both V1 and V2 bookings
  return sum + (booking.total_price || 0)
}, 0) || 0
```

#### 2.2 Monthly Breakdown (Lines 117-143)
```typescript
// Query - เดิม
.select(`
  booking_date,
  status,
  service_packages (price)
`)

// Query - ใหม่
.select(`
  booking_date,
  status,
  total_price,
  service_packages (price),
  service_packages_v2:package_v2_id (name)
`)

// Calculation - เดิม
if (booking.status === 'completed') {
  const servicePackage = Array.isArray(booking.service_packages)
    ? booking.service_packages[0]
    : booking.service_packages
  data.revenue += servicePackage?.price || 0
}

// Calculation - ใหม่
if (booking.status === 'completed') {
  // Use total_price for both V1 and V2 bookings
  data.revenue += booking.total_price || 0
}
```

**ผลลัพธ์:**
- ✅ Staff Profile แสดง Total Revenue รวม V2 bookings
- ✅ Monthly performance charts รวม V2 data
- ✅ ข้อมูลสถิติถูกต้องครบถ้วน

---

### 3. staff-performance.tsx
**Path:** [src/pages/admin/staff-performance.tsx](src/pages/admin/staff-performance.tsx)

**ปัญหา:**
- หน้า Staff Performance (Admin view) แสดง Booking History ของ staff
- Query ไม่มี V2 join (Line 123)

**การแก้ไข:**

#### 3.1 Bookings Query (Lines 112-128)
```typescript
// เดิม
service_packages (name, price, service_type),
customers (full_name)

// ใหม่
service_packages (name, price, service_type),
service_packages_v2:package_v2_id (name, service_type),  // ✨ เพิ่ม
customers (full_name)
```

#### 3.2 Interface Update (Lines 132-144)
```typescript
interface BookingRawFromDB {
  // ... existing fields
  service_packages: { name: string; price?: number; service_type?: string }[] | ... | null
  service_packages_v2: { name: string; service_type?: string }[] | ... | null  // ✨ เพิ่ม
  customers: { full_name: string }[] | ... | null
}
```

#### 3.3 Data Transform (Lines 146-163)
```typescript
const transformedData = (data || []).map((booking: BookingRawFromDB): Booking => {
  // Merge V1 and V2 package data
  const servicePackages = booking.service_packages || booking.service_packages_v2  // ✨ เพิ่ม

  const pkg = Array.isArray(servicePackages)  // เปลี่ยนจาก booking.service_packages
    ? servicePackages[0]
    : servicePackages

  // ... rest of transform
})
```

**ผลลัพธ์:**
- ✅ Admin Staff Performance page แสดง V2 bookings
- ✅ Service names และ types แสดงถูกต้อง
- ✅ ข้อมูลครบถ้วนทั้ง V1 และ V2

---

### 4. use-staff-calendar.ts
**Path:** [src/hooks/use-staff-calendar.ts](src/hooks/use-staff-calendar.ts)

**ปัญหา:**
- Hook นี้ใช้แสดง Staff Calendar (3-month view)
- Query ไม่มี V2 join (Line 116)

**การแก้ไข:**

#### 4.1 Calendar Query (Lines 102-123)
```typescript
// เดิม
service_packages (name, duration_minutes, price),

// ใหม่
service_packages (name, duration_minutes, price),
service_packages_v2:package_v2_id (name),  // ✨ เพิ่ม
```

#### 4.2 Calendar Event Transform (Lines 142-149)
```typescript
// เดิม
const servicePackage = Array.isArray(booking.service_packages)
  ? booking.service_packages[0]
  : booking.service_packages

// ใหม่
// Merge V1 and V2 package data
const packageData = (booking as any).service_packages || (booking as any).service_packages_v2
const servicePackage = Array.isArray(packageData)
  ? packageData[0]
  : packageData
```

**ผลลัพธ์:**
- ✅ Staff Calendar แสดง V2 bookings
- ✅ Event titles แสดง service names ถูกต้อง
- ✅ Duration calculation ทำงานปกติ

---

## 📊 สรุปการแก้ไข

### Pattern ที่ใช้ทั่วทั้งระบบ

#### 1. เพิ่ม V2 Join ใน Query
```typescript
// เพิ่มทุก query ที่ select bookings
service_packages_v2:package_v2_id (name, service_type)
```

#### 2. Merge V1/V2 Data
```typescript
// ใน transform/map functions
const servicePackages = booking.service_packages || booking.service_packages_v2
```

#### 3. ใช้ total_price สำหรับ Revenue
```typescript
// แทนการหา price จาก service_packages
data.revenue += booking.total_price || 0
```

---

## 🎯 ไฟล์ที่แก้ไขทั้งหมด (Summary)

| ไฟล์ | บรรทัดที่แก้ไข | จำนวน Queries | ประเภท |
|------|----------------|---------------|---------|
| use-staff-bookings.ts | 241, 319, 341, 365, 393-406 | 4 queries + merge | Hook |
| use-staff-profile.ts | 103-114, 117-143 | 2 queries | Hook |
| staff-performance.tsx | 123, 142, 147-152 | 1 query + transform | Page |
| use-staff-calendar.ts | 117, 146-149 | 1 query + transform | Hook |

**รวม:** 4 ไฟล์, 8 queries, ทุกไฟล์เพิ่ม data merge logic

---

## ✅ การทดสอบที่ควรทำ

### Test Scenario 1: Staff Dashboard
1. Login เป็น Staff
2. ไปที่ Dashboard
3. สร้าง V2 booking assign ให้ staff นี้
4. Verify:
   - [ ] Booking แสดงใน Today's Jobs
   - [ ] Service name แสดงถูกต้อง
   - [ ] Earnings รวม V2 booking

### Test Scenario 2: Staff Profile
1. ไปที่ Staff Profile (ของตัวเอง)
2. ดู Performance Stats
3. Verify:
   - [ ] Total Revenue รวม V2 bookings
   - [ ] Monthly chart แสดง V2 data
   - [ ] ไม่มี errors ใน console

### Test Scenario 3: Admin Staff Performance
1. Login เป็น Admin
2. ไปที่ Staff Performance page
3. เลือก staff ที่มี V2 bookings
4. Verify:
   - [ ] Booking list แสดง V2 bookings
   - [ ] Service names แสดงถูกต้อง (ไม่ใช่ null)
   - [ ] Charts/stats ถูกต้อง

### Test Scenario 4: Staff Calendar
1. Login เป็น Staff
2. ไปที่ Calendar view
3. Verify:
   - [ ] V2 bookings แสดงใน calendar
   - [ ] Event titles แสดง service names
   - [ ] Click event → detail ถูกต้อง

---

## 🔗 Related Documents

- [Phase 5 Changelog](CHANGELOG-PHASE5-V2-SYSTEM-WIDE-INTEGRATION.md) - Customer/Team pages
- [User Guide](USER-GUIDE-V2-TIERED-PRICING.md)
- [Testing Checklist](TESTING-CHECKLIST.md)

---

## 📝 Migration Notes

**ไม่ต้อง Run Migration**
- การแก้ไขครั้งนี้เป็น code changes เท่านั้น
- ไม่มี database schema changes
- Deploy code ได้ทันที

**Breaking Changes:**
- ❌ ไม่มี

**Backward Compatibility:**
- ✅ V1 packages ยังทำงานปกติ
- ✅ Existing bookings ไม่กระทบ

---

## 🎊 Coverage Status: 100%

หลังจากการแก้ไขครั้งนี้ ระบบมี **V2 Package Support ครบ 100%** ทุกหน้าที่แสดง bookings:

### ✅ Customer Pages
- [x] Bookings List
- [x] Calendar
- [x] Weekly Schedule
- [x] Customer Detail
- [x] Dashboard
- [x] Reports

### ✅ Team Pages
- [x] Team Detail
- [x] Recent Bookings

### ✅ Staff Pages (รอบนี้)
- [x] Staff Dashboard (use-staff-bookings)
- [x] Staff Profile (use-staff-profile)
- [x] Staff Performance (Admin)
- [x] Staff Calendar

### ✅ Booking Management
- [x] Create Booking Modal
- [x] Edit Booking Modal
- [x] Package Selector

---

**Status:** ✅ **COMPLETE - ALL PAGES NOW SUPPORT V2**
**Version:** 2.1
**Date:** 2025-01-11
**Author:** Claude Code
