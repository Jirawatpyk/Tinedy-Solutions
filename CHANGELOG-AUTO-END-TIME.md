# Auto-Calculate End Time Feature

## สรุปการเปลี่ยนแปลง

เพิ่มฟีเจอร์คำนวณเวลาสิ้นสุด (End Time) อัตโนมัติจาก:
- **Start Time** ที่เลือก
- **Duration** จากแพ็คเก็จ (V1: duration_minutes, V2: estimated_hours)

---

## ไฟล์ที่แก้ไข

### 1. **PackageSelector.tsx**
- เพิ่ม `estimatedHours` ใน `PackageSelectionData` interface
- ส่ง `estimatedHours` กลับมาพร้อม selection data:
  - **V1 (Fixed):** `duration_minutes / 60`
  - **V2 (Tiered):** `tier.estimated_hours`

```typescript
export interface PackageSelectionData {
  packageId: string
  pricingModel: 'fixed' | 'tiered'
  areaSqm?: number
  frequency?: BookingFrequency
  price: number
  requiredStaff: number
  packageName: string
  estimatedHours?: number // ✨ ใหม่
}
```

### 2. **BookingCreateModal.tsx**

#### การเปลี่ยนแปลง:
1. **Auto-calculate เมื่อเลือก Package:**
   ```typescript
   // หลังจากเลือก package แล้ว
   if (createForm.formData.start_time && selection.estimatedHours) {
     const durationMinutes = Math.round(selection.estimatedHours * 60)
     const endTime = calculateEndTime(createForm.formData.start_time, durationMinutes)
     createForm.handleChange('end_time', endTime)
   }
   ```

2. **Auto-calculate เมื่อเปลี่ยน Start Time:**
   ```typescript
   onChange={(e) => {
     const newStartTime = e.target.value
     createForm.handleChange('start_time', newStartTime)

     // คำนวณ End Time อัตโนมัติ
     if (newStartTime && packageSelection?.estimatedHours) {
       const durationMinutes = Math.round(packageSelection.estimatedHours * 60)
       const endTime = calculateEndTime(newStartTime, durationMinutes)
       createForm.handleChange('end_time', endTime)
     }
   }}
   ```

3. **UI Changes:**
   - Label: `"End Time (Auto-calculated) *"`
   - Placeholder: `"คำนวณอัตโนมัติจากแพ็คเก็จ"`
   - Disabled: เมื่อมี `estimatedHours` จะปิดการแก้ไขเอง
   - Description: แสดงชั่วโมงที่ใช้คำนวณ

### 3. **BookingEditModal.tsx**
- แก้ไขเหมือนกับ BookingCreateModal ทุกประการ

---

## การทำงาน

### สถานการณ์ 1: เลือก Package ก่อน
1. เลือก **Deep Cleaning Office** (estimated_hours = 2.5 ชม.)
2. ตั้ง **Start Time = 09:00**
3. **End Time จะถูกคำนวณอัตโนมัติ** = 11:30

### สถานการณ์ 2: ตั้ง Start Time ก่อน
1. ตั้ง **Start Time = 09:00**
2. เลือก **Deep Cleaning Office** (estimated_hours = 2.5 ชม.)
3. **End Time จะถูกคำนวณอัตโนมัติ** = 11:30

### สถานการณ์ 3: เปลี่ยน Start Time
1. Package: **Deep Cleaning Office** (2.5 ชม.)
2. Start Time: **09:00** → End Time: **11:30**
3. **เปลี่ยน** Start Time → **14:00**
4. **End Time จะอัพเดทอัตโนมัติ** → **16:30**

---

## UI/UX Improvements

### Before:
```
End Time (Optional)
[          ]  Optional
```

### After:
```
End Time (Auto-calculated) *
[   11:30   ]  คำนวณจากระยะเวลา 2.5 ชม.
🔒 Disabled (ไม่สามารถแก้ไขได้)
```

---

## Benefits

✅ **ลดข้อผิดพลาด** - ไม่ต้องคำนวณเวลาเอง
✅ **ประหยัดเวลา** - ระบบคำนวณให้อัตโนมัติ
✅ **ความแม่นยำ** - ใช้ระยะเวลาจาก Package Tier จริง
✅ **UX ดีขึ้น** - แสดงชั่วโมงที่ใช้คำนวณชัดเจน

---

## Testing Checklist

- [ ] เลือก V1 Package (Fixed) → End Time ถูกคำนวณจาก duration_minutes
- [ ] เลือก V2 Package (Tiered) → End Time ถูกคำนวณจาก estimated_hours
- [ ] เปลี่ยน Start Time → End Time อัพเดทอัตโนมัติ
- [ ] Edit Booking → End Time ถูกคำนวณอัตโนมัติเหมือนกัน
- [ ] End Time field ถูก disabled เมื่อมี estimatedHours
- [ ] Description แสดงชั่วโมงที่ใช้คำนวณถูกต้อง

---

## Notes

- ฟังก์ชัน `calculateEndTime()` ถูกส่งมาจาก parent component (bookings.tsx)
- End Time จะถูก disabled เมื่อมี `estimatedHours` แต่ยังสามารถแก้ไขเองได้ถ้าไม่มี duration
- สำหรับ V2 Tiered Pricing: `estimated_hours` มาจาก tier ที่ตรงกับพื้นที่ที่เลือก

---

**Date:** 2025-01-11
**Author:** Claude Code
**Version:** 1.0
