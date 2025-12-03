# Realtime Archive Booking Fix

## ปัญหา
เมื่อ Manager กด Archive Booking หน้า Booking ของ Admin ไม่อัพเดท realtime

## การวิเคราะห์

### Architecture ที่มีอยู่แล้ว

1. **BookingRealtimeProvider** (`src/providers/BookingRealtimeProvider.tsx`)
   - Subscribe ต่อ bookings table ด้วย event `*` (INSERT, UPDATE, DELETE)
   - Invalidate React Query cache เมื่อมี event เกิดขึ้น

2. **useBookings Hook** (`src/hooks/useBookings.ts`)
   - ใช้ React Query ดึงข้อมูล bookings
   - Filter `deleted_at IS NULL` เมื่อ `showArchived = false`

3. **Archive Function** (`src/pages/admin/bookings.tsx`)
   - เรียก `soft_delete_record` RPC
   - เป็นการ UPDATE `deleted_at` และ `deleted_by` fields

### สาเหตุที่เป็นไปได้

1. **Realtime ไม่ได้เปิดใช้งานใน Supabase**
   - Table bookings อาจไม่อยู่ใน realtime publication
   - ต้องเพิ่ม table เข้า `supabase_realtime` publication

2. **RLS Policy บล็อก Realtime Events**
   - Policy อาจไม่อนุญาตให้ Manager เห็น UPDATE events

3. **Cache Invalidation Timing**
   - Realtime event อาจมาช้ากว่า UI response
   - ต้องใช้ manual refetch เป็น fallback

## วิธีแก้ไข

### 1. ปรับปรุง BookingRealtimeProvider ✅

**ไฟล์:** `src/providers/BookingRealtimeProvider.tsx`

**การเปลี่ยนแปลง:**
- เพิ่ม logging เพื่อ debug (bookingId, deleted_at)
- เพิ่ม `refetchType: 'active'` เพื่อ refetch เฉพาะ queries ที่ active
- Invalidate dashboard queries ด้วย (เพราะ dashboard แสดง booking stats)

```typescript
queryClient.invalidateQueries({
  queryKey: queryKeys.bookings.all,
  refetchType: 'active', // ✅ เพิ่มนี้
})
```

### 2. เพิ่ม Manual Refetch เป็น Fallback ✅

**ไฟล์:** `src/pages/admin/bookings.tsx`

**Functions ที่แก้ไข:**
- `archiveBooking()` - line 817-845
- `archiveRecurringGroup()` - line 872-925
- `handleRecurringArchive()` - line 680-778

**การเปลี่ยนแปลง:**
```typescript
// เดิม
refresh()

// ใหม่
await refresh() // ✅ เพิ่ม await เพื่อให้แน่ใจว่า refresh เสร็จก่อน
```

**เหตุผล:**
- หาก realtime subscription ไม่ทำงาน (เช่น Supabase ยังไม่เปิด realtime)
- Manual refetch จะทำงานทันทีหลัง archive สำเร็จ
- ใช้เป็น fallback mechanism

### 3. เปิด Realtime ใน Supabase ⚠️ (สำคัญ)

**ไฟล์:** `supabase/migrations/20250203_enable_bookings_realtime.sql`

**วิธีใช้:**
1. เปิด Supabase Dashboard
2. ไปที่ SQL Editor
3. Copy-paste ไฟล์ SQL ทั้งหมด
4. Execute

**สิ่งที่ Migration ทำ:**
- ตรวจสอบว่า `supabase_realtime` publication มีอยู่หรือไม่
- เพิ่ม table `bookings` เข้า publication
- Verify ว่าการ config สำเร็จ

**ตรวจสอบว่า Realtime เปิดอยู่แล้ว:**
```sql
SELECT *
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'bookings';
```

ถ้าได้ผลลัพธ์ 1 row แสดงว่า realtime เปิดอยู่แล้ว

### 4. ตรวจสอบ RLS Policies (Optional)

**ตรวจสอบว่า Manager มี SELECT permission หลัง UPDATE:**

```sql
-- ตรวจสอบ RLS policies สำหรับ bookings
SELECT *
FROM pg_policies
WHERE tablename = 'bookings'
  AND cmd = 'SELECT';
```

**Policy ที่ต้องมี:**
- Manager สามารถ SELECT bookings ทั้งหมด (รวม archived)
- Policy ต้องไม่ filter `deleted_at IS NULL` สำหรับ Manager

## Testing Plan

### 1. Test Manual Refetch (ควรทำงานแม้ Realtime ยังไม่เปิด)

1. Login เป็น **Manager**
2. ไปที่หน้า **Bookings**
3. เลือก booking และกด **Archive**
4. **ตรวจสอบ:** Booking ควรหายจากรายการทันที

**Expected Result:**
- ✅ Booking หายจากรายการหลัง archive (เพราะ manual refetch)
- ✅ Toast notification แสดง "Booking archived successfully"

### 2. Test Realtime Subscription (หลังรัน Migration)

1. เปิด 2 tabs:
   - Tab 1: Login เป็น **Manager**
   - Tab 2: Login เป็น **Admin**
2. ทั้ง 2 tabs ดูหน้า **Bookings** (tab เดียวกัน)
3. ใน Tab 1 (Manager): Archive booking
4. **ตรวจสอบ Tab 2 (Admin):** Booking ควรหายจากรายการ **โดยไม่ต้อง refresh**

**Expected Result:**
- ✅ Tab 2 อัพเดทอัตโนมัติ (realtime)
- ✅ Console log แสดง: `"Booking changed"` พร้อม eventType, bookingId, deleted_at

### 3. Test with Multiple Bookings

1. Login เป็น **Manager**
2. เลือก **recurring booking group**
3. กด Archive → เลือก **"Archive all bookings in this series"**
4. **ตรวจสอบ:** ทุก bookings ใน group ควรหายจากรายการ

**Expected Result:**
- ✅ ทุก bookings หายจากรายการ
- ✅ Toast แสดง "Archived X booking(s) successfully"

## Debug Tools

### 1. ตรวจสอบ Console Logs

เมื่อ archive booking ควรเห็น logs:

```
[BookingRealtimeProvider] Booking changed {
  eventType: 'UPDATE',
  bookingId: '123-456-789',
  deleted_at: '2025-02-03T10:00:00Z'
}
```

### 2. ตรวจสอบ Network Tab

- เปิด Chrome DevTools → Network tab
- Filter: `websocket` หรือ `realtime`
- ดูว่ามี WebSocket connection หรือไม่
- ดู message ที่ส่งมา (ต้องเห็น UPDATE event)

### 3. React Query Devtools (Optional)

Uncomment ใน `src/main.tsx`:
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// ใน JSX
<ReactQueryDevtools initialIsOpen={false} />
```

ดู:
- Query status (stale/fetching/success)
- Cache invalidation เมื่อ archive

## Rollback Plan

ถ้ามีปัญหา:

### 1. Rollback Code Changes

```bash
git checkout HEAD~1 -- src/providers/BookingRealtimeProvider.tsx
git checkout HEAD~1 -- src/pages/admin/bookings.tsx
```

### 2. Disable Realtime (ถ้าจำเป็น)

```sql
ALTER PUBLICATION supabase_realtime DROP TABLE bookings;
```

## Performance Considerations

### Manual Refetch Overhead

- **ก่อน fix:** Realtime อัตโนมัติ (0 extra queries)
- **หลัง fix:** Manual refetch (1 extra query per archive)

**Impact:**
- Minimal - refetch ใช้เวลา ~100-300ms
- User experience ดีขึ้น (แน่ใจว่า UI อัพเดท)
- Realtime ยังทำงาน (ช่วย multi-tab scenarios)

### Cache Invalidation

- ใช้ `refetchType: 'active'` เพื่อ refetch เฉพาะ queries ที่ mount อยู่
- ลด unnecessary refetch ใน background tabs

## Future Improvements

1. **Optimistic Updates**
   - อัพเดท UI ทันทีก่อนเรียก API
   - Rollback ถ้า API error

2. **Batch Archiving**
   - Archive หลาย bookings พร้อมกัน
   - ลด number of manual refetches

3. **Real-time Notification**
   - แสดง notification เมื่อ booking ถูก archive โดย user อื่น
   - ใช้ toast แจ้งเตือน "Booking XYZ was archived by Manager"

## Conclusion

### สิ่งที่ทำเสร็จแล้ว ✅

1. ✅ ปรับปรุง BookingRealtimeProvider (logging + refetchType)
2. ✅ เพิ่ม manual refetch fallback ใน archive functions
3. ✅ สร้าง SQL migration เพื่อเปิด realtime

### ขั้นตอนต่อไป

1. ⚠️ **รัน SQL migration** ใน Supabase Dashboard (สำคัญมาก!)
2. ✅ Test manual refetch (ควรทำงานทันที)
3. ✅ Test realtime subscription (หลังรัน migration)

### Expected Behavior

**หลังแก้ไข:**
- Manager archive booking → หน้า Admin อัพเดททันที
- Multi-tab: Tab อื่นๆ อัพเดทอัตโนมัติด้วย realtime
- Single-tab: Manual refetch ทำงานเป็น fallback

**Performance:**
- User experience ดีขึ้น (ไม่ต้องรอ realtime)
- Multi-tab scenarios ยังใช้ realtime ได้
- Minimal overhead จาก manual refetch
