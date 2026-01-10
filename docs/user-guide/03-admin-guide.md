# ส่วนที่ 3: คู่มือสำหรับ Admin (ผู้ดูแลระบบ)

> **ผู้อ่านเป้าหมาย:** Admin ที่มีสิทธิ์เต็มในการจัดการระบบทั้งหมด
> **ภาษา:** ไทย (ศัพท์เทคนิคใช้ English)
> **ความยาว:** ~2,000 บรรทัด (ใช้ TOC และ Ctrl+F เพื่อค้นหา)

💡 **Navigation Tip:** เอกสารนี้ยาว - ใช้ Table of Contents ด้านล่างเพื่อข้ามไปยังส่วนที่ต้องการ หรือกด `Ctrl+F` เพื่อค้นหา

---

## 📋 สารบัญ (Table of Contents)

**Quick Jump:**
[Dashboard](#31-dashboard--แดชบอร์ดภาพรวม) | [Bookings](#32-bookings--การจัดการนัดหมายการจอง) | [Calendar](#33-calendar--ปฏิทินการจอง) | [Customers](#34-customers--การจัดการข้อมูลลูกค้า) | [Staff](#35-staff--การจัดการพนักงาน) | [Teams](#36-teams--การจัดการทีม) | [Reports](#38-reports--analytics--รายงานและการวิเคราะห์) | [Settings](#310-settings--การตั้งค่าระบบ)

**Detailed Sections:**
1. [3.1 Dashboard - แดชบอร์ดภาพรวม](#31-dashboard--แดชบอร์ดภาพรวม)
2. [3.2 Bookings - การจัดการนัดหมาย/การจอง](#32-bookings--การจัดการนัดหมายการจอง)
3. [3.3 Calendar - ปฏิทินการจอง](#33-calendar--ปฏิทินการจอง)
4. [3.4 Customers - การจัดการข้อมูลลูกค้า](#34-customers--การจัดการข้อมูลลูกค้า)
5. [3.5 Staff - การจัดการพนักงาน](#35-staff--การจัดการพนักงาน)
6. [3.6 Teams - การจัดการทีม](#36-teams--การจัดการทีม)
7. [3.7 Service Packages - การจัดการแพ็คเกจบริการ](#37-service-packages--การจัดการแพ็คเกจบริการ)
8. [3.8 Reports & Analytics - รายงานและการวิเคราะห์](#38-reports--analytics--รายงานและการวิเคราะห์)
9. [3.9 Chat - ระบบแชทภายใน](#39-chat--ระบบแชทภายใน)
10. [3.10 Settings - การตั้งค่าระบบ](#310-settings--การตั้งค่าระบบ)
11. [3.11 Profile - จัดการโปรไฟล์](#311-profile--จัดการโปรไฟล์)
12. [Quick Tips & Best Practices](#quick-tips-สำหรับ-admin)

---

## 3.1 Dashboard - แดชบอร์ดภาพรวม

### ภาพรวม

Dashboard (`/admin`) เป็นหน้าแรกที่ Admin เห็นเมื่อเข้าสู่ระบบ โดยแสดง **ข้อมูลภาพรวมในเวลาจริง (Real-time Overview)** ของการปฏิบัติงาน

### สถิติหลัก (Key Metrics)

Dashboard แสดงข้อมูลสถิติสำคัญ **4 ด้าน:**

#### 1. Today's Jobs - งานวันนี้
- **คำอธิบาย:** จำนวนการจองทั้งหมดสำหรับวันนี้
- **ตัวอย่าง:** "12 Jobs" หมายความว่ามี 12 การจองตั้งแต่เริ่มต้นวันจนถึงปัจจุบัน
- **ประโยชน์:** เห็นอัตราการทำงานรายวัน

#### 2. Revenue - รายได้
- **คำอธิบาย:** รายได้รวมจากการจองที่ชำระเงินแล้วและรอชำระ
- **ตัวอย่าง:** "฿45,500" = รายได้สะสมของวันนี้
- **บันทึก:** ใช้ **Thai Baht (฿)** เสมอ

#### 3. Completion Rate - อัตราความสำเร็จ
- **คำอธิบาย:** เปอร์เซ็นต์ของการจองที่สำเร็จเมื่อเทียบกับการจองทั้งหมด
- **ตัวอย่าง:** "92%" = 92 จาก 100 การจองสำเร็จ
- **เป้าหมาย:** มักเป้าหมายคือ 90% ขึ้นไป

#### 4. On-time Completion - การสำเร็จตรงเวลา
- **คำอธิบาย:** เปอร์เซ็นต์ของการจองที่เสร็จตามกำหนดเวลา

### กราฟและการวิเคราะห์

#### Revenue Over Time - รายได้ตามช่วงเวลา

**ประเภท:** Line Chart (กราฟเส้น)
**ข้อมูล:** รายได้เทียบกับวันที่ (7 วันล่าสุด หรือช่วงที่เลือก)

**วิธีอ่าน:**
- ❌ ถ้าเส้นลง = รายได้ลดลง (ปัญหาในงาน)
- ✅ ถ้าเส้นขึ้น = รายได้เพิ่มขึ้น (ธุรกิจเจริญรุ่งเรือง)

**ตัวอย่าง Use Case:**
```
สัปดาห์ที่แล้ว: ฿200,000
วันนี้: ฿30,000
→ ต้องเพิ่มการจองหรือตรวจสอบสาเหตุ
```

#### Booking Status Pie Chart - สัดส่วนสถานะการจอง

**ประเภท:** Pie Chart (วงกลม)
**ข้อมูล:** สัดส่วนของการจองตามสถานะต่างๆ

**สถานะการจอง:**
- 🟡 **Pending** (รอการยืนยัน)
- 🟢 **Confirmed** (ยืนยันแล้ว)
- 🔵 **In Progress** (กำลังทำ)
- ⚪ **Completed** (เสร็จสิ้น)
- ⚫ **Cancelled** (ยกเลิก)

**ตัวอย่าง:**
- Completed: 65%
- In Progress: 20%
- Confirmed: 10%
- Pending: 5%

#### Today's Appointments List - รายชื่อการนัดหมายวันนี้

**รูปแบบ:** ตารางแสดงการจองทั้งหมดของวันนี้

**คอลัมน์หลัก:**
| ลูกค้า | บริการ | เวลา | สถานะ | อัตราการทำงาน |
|------|------|------|------|-----------|
| นายสมชาย | ทำความสะอาด | 09:00 | ✅ Completed | เสร็จแล้ว |
| น.ส.ลินดา | ซ่อมท่อน้ำ | 14:00 | 🔵 In Progress | กำลังทำ |

**การโต้ตอบ:**
1. **คลิกการจอง** = เปิด Modal รายละเอียด
2. **ปุ่ม Call** = โทรไปยังลูกค้า (จำเป็นต้องปล่อยให้ผ่าน stopPropagation)
3. **ปุ่ม Maps** = ดูตำแหน่งที่อยู่

---

## 3.2 Bookings - การจัดการนัดหมาย/การจอง

### ภาพรวม

หน้า Bookings (`/admin/bookings`) เป็นศูนย์กลางการจัดการการจองทั้งหมด โดย Admin มีสิทธิ์เต็มในการสร้าง อ่าน อัพเดต และลบ

### ฟีเจอร์หลัก

#### 1. การสร้างการจองใหม่ (Create Booking)

**ขั้นตอนทีละขั้น:**

1. **คลิกปุ่ม "เพิ่มการจอง" (+ New Booking)**
   - Modal เปิดขึ้นพร้อมฟอร์มการสร้าง

2. **เลือกลูกค้า (Customer)**
   - ค้นหาจากชื่อ โทรศัพท์ หรืออีเมล
   - หรือสร้างลูกค้าใหม่ได้
   ```
   💡 Tip: ลูกค้าที่จองบ่อยจะแสดงชื่อข้างต้น
   ```

3. **เลือกแพ็คเกจบริการ (Service Package)**
   - เลือกจาก V1 (Legacy) หรือ V2 (Current)
   - **V2 มีระดับขนาด:**
     - Small (เล็ก)
     - Medium (กลาง)
     - Large (ใหญ่)
   - ราคาและระยะเวลาจะอัพเดตอัตโนมัติ
   ```
   ✅ Duration auto-calculate จากแพ็คเกจ
   ```

4. **กำหนดวันที่และเวลา**
   - วันที่: ใช้ Date Picker
   - เวลาเริ่ม: ใช้ Time Picker
   - เวลาสิ้นสุด: **คำนวณอัตโนมัติจากระยะเวลาแพ็คเกจ**
   ```
   ตัวอย่าง:
   แพ็คเกจ: Cleaning Medium (90 นาที)
   เวลาเริ่ม: 10:00
   เวลาสิ้นสุด: 11:30 ✅ (auto-calculated)
   ```

5. **ระบุที่อยู่**
   - ใช้ที่อยู่ของลูกค้าเป็นค่าเริ่มต้น
   - ตั้งแต่ว่างได้ตามต้องการ
   ```
   เชื่อมโยงกับที่อยู่ลูกค้า: เลือกช่องควบคุม "ใช้ที่อยู่ของลูกค้า"
   ```

6. **มอบหมายงาน (Assignment)**
   - **ตัวเลือก A: งานให้พนักงาน (Staff)**
     ```
     ☑️ Assign to Staff
     → เลือกพนักงาน 1 คน
     ```
   - **ตัวเลือก B: งานให้ทีม (Team)**
     ```
     ☑️ Assign to Team
     → เลือกทีม 1 ทีม (สมาชิกทั้งหมดเห็นการจองนี้)
     ```
   - **สำคัญ:** ⚠️ **ห้ามเลือกทั้งสองอย่าง** (Staff AND Team พร้อมกัน)

7. **ติดตามการชำระเงิน (Payment Tracking)**
   - สถานะการชำระ:
     - 💰 Unpaid (ยังไม่ชำระ)
     - 💳 Partial (ชำระบางส่วน)
     - ✅ Paid (ชำระเต็มแล้ว)
   - วิธีชำระเงิน:
     - Cash (สด)
     - Credit Card
     - Bank Transfer
     - PromptPay
     - Other
   - อัพโหลดสลิปชำระเงิน (ถ้ามี)

8. **สำเร็จ**
   - คลิก "สร้าง" → ระบบบันทึกการจอง
   - หากเสร็จ: Modal ปิด, รายชื่อโหลดใหม่

**ตัวอย่าง Error:**
```
❌ "มีการจองสำหรับเวลานี้อยู่แล้ว"
→ ระบบตรวจหา Conflict
→ แนะนำให้เลือกเวลาอื่น
```

#### 2. การค้นหาและกรองการจอง (Search & Filters)

**ฟีเจอร์ค้นหา:**
- **Search Box:** ค้นหาด้วย:
  - ชื่อลูกค้า
  - Booking ID
  - เบอร์โทรศัพท์

**ตัวกรอง (Filters):**

| ตัวกรอง | ตัวเลือก | ตัวอย่าง |
|--------|--------|--------|
| **Status** | Pending, Confirmed, In Progress, Completed, Cancelled | เลือก "Completed" เพื่อดูงานเสร็จสิ้น |
| **Staff** | รายชื่อพนักงาน | เลือก "สมชาย" เพื่อดูงานของสมชาย |
| **Team** | รายชื่อทีม | เลือก "Team A" เพื่อดูงานของทีม A |
| **Date Range** | จาก - ถึง | 01/01/2025 - 31/01/2025 |
| **Payment Status** | Paid, Unpaid, Partial | เลือก "Unpaid" เพื่อดูงานค้างชำระ |

**วิธีใช้ Filters:**
1. คลิก "🔍 Filters" หรือไอคอนตัวกรอง
2. เลือกตัวกรองที่ต้องการ
3. ระบบจะแสดงผลลัพธ์ที่ตรงกัน
4. เพื่อล้างตัวกรอง: คลิก "🔄 Reset Filters"

**ตัวอย่าง Real-world:**
```
ต้องการดูงานค้างชำระของเดือนนี้:
1. Filter: Status = "Completed"
2. Filter: Payment Status = "Unpaid"
3. Filter: Date Range = "01/01/2025 - 31/01/2025"
→ ได้รายชื่องานเสร็จแล้วแต่ยังไม่ชำระ
```

#### 3. การแก้ไขและอัพเดทสถานะ (Edit & Status Update)

**การเปลี่ยนสถานะ (Status Flow):**

```
Pending ──→ Confirmed ──→ In Progress ──→ Completed
                                      ↓
                                   Cancelled
```

**วิธีเปลี่ยนสถานะ (Quick Status Change):**

1. **จากรายชื่อ (List View):**
   - Hover ที่การจอง → ปุ่มเลือกสถานะปรากฏ
   - คลิกเลือกสถานะใหม่
   - ระบบบันทึกอัตโนมัติ

2. **จากรายละเอียด (Detail Modal):**
   - คลิกการจองเพื่อเปิด Modal
   - เลือก "Change Status"
   - เลือกสถานะใหม่
   - คลิก "Update"

**ตัวอย่าง:**
```
เวลา 14:00 พนักงานเริ่มงาน:
Status: Pending ──→ In Progress ✅
```

#### 4. การจัดการการจองแบบซ้ำ (Recurring Bookings)

**สำหรับการจองที่เกิดซ้ำๆ:** เช่น "ทำความสะอาดบ้านทุกสัปดาห์"

**ประเภท Recurring:**

| ประเภท | ตัวอย่าง | การจองเกิดขึ้น |
|-------|--------|------------|
| **Daily** | ทำความสะอาดทุกวัน | ทุกวันในช่วง end_date |
| **Weekly** | ซ่อมแอร์ทุกสัปดาห์วันศุกร์ | ทุก 7 วัน |
| **Monthly** | ปรึกษาการจัดการทุกเดือน | ทุก 30 วัน |

**การสร้างการจองซ้ำ:**

1. สร้างการจองตามปกติ
2. เลือก "✓ This is a recurring booking"
3. เลือก Pattern:
   - Daily / Weekly / Monthly
4. เลือก End Date (จะหยุดสร้างหลังวันนี้)
5. ระบบสร้าง Multiple bookings อัตโนมัติ

**ตัวอย่าง:**
```
Recurring: Weekly, Every Friday
Start: 10 Jan 2025
End: 31 Mar 2025
→ ระบบสร้างการจอง 13 ครั้ง (13 สัปดาห์)
```

**การจัดการกลุ่มซ้ำ (Recurring Group Management):**

- **ดูทั้งกลุ่ม:** คลิกการจองใดๆ ในกลุ่ม → ดูทั้ง series
- **แก้ไขทั้งกลุ่ม:**
  ```
  ✅ Update all in series
  → ปรับปรุงทุกการจองในสัปดาห์/เดือนเดียวกัน
  ```
- **ลบทั้งกลุ่ม:**
  ```
  🗑️ Delete all in series
  → ลบการจองทั้งหมดในสัปดาห์/เดือนเดียวกัน
  ```

#### 5. การตรวจสอบความขัดแย้ง (Conflict Detection)

**ระบบป้องกันปัญหา:**

✅ **ระบบตรวจหา:**
- การจองสำหรับพนักงานเดียวกันในเวลาเดียวกัน
- การจองสำหรับลูกค้าเดียวกันในเวลาเดียวกัน

❌ **เมื่อเกิดความขัดแย้ง:**
```
⚠️ "conflict detected"
"พนักงาน 'สมชาย' มีการจองแล้ว
  เวลา 10:00 - 11:30 (ทำความสะอาด)"

ตัวเลือก:
  ☐ ใช้พนักงานคนอื่น
  ☐ เปลี่ยนเวลา
  ☐ ยังคงทำต่อ (ไม่แนะนำ)
```

💡 **Best Practice:**
```
ป้องกัน Conflict:
1. ดูปฏิทินก่อนสร้างการจอง
2. เลือกเวลาที่ว่าง
3. โปรดทำตามคำแนะนำของระบบ
```

#### 6. การดำเนินการหลายรายการ (Bulk Actions)

**สถานการณ์:** ต้องการเปลี่ยนสถานะการจอง 10 รายการพร้อมกัน

**วิธีการ:**

1. **เลือกการจองหลายรายการ:**
   - Checkbox ด้านซ้ายแต่ละแถว
   - ☐ "Select All" เพื่อเลือกทั้งหมด

2. **Bulk Actions Toolbar ปรากฏ:**
   - ปุ่ม "Change Status to..."
   - ปุ่ม "Export Selected"
   - ปุ่ม "Delete Selected"

3. **ตัวอย่าง:**
   ```
   เลือก 5 การจองที่ค้างชำระ
   → Bulk: "Change Status to Completed"
   → ทั้ง 5 รายการเปลี่ยนเป็น Completed
   ```

#### 7. การติดตามสถานะการชำระเงิน (Payment Status Tracking)

**สถานะการชำระ:**

| สถานะ | ความหมาย | การกระทำต่อ |
|------|--------|----------|
| 💰 **Unpaid** | ยังไม่ชำระเงิน | ติดตามชำระ |
| 💳 **Partial** | ชำระบางส่วน | รับเงินส่วนที่เหลือ |
| ✅ **Paid** | ชำระเต็มแล้ว | ปิด |

**วิธีอัพเดตสถานะชำระเงิน:**

1. เปิดรายละเอียดการจอง
2. เลือก "Payment" section
3. เลือกสถานะใหม่
4. อัพโหลดสลิปชำระเงิน (optional)
5. คลิก "Update Payment"

**ตัวอย่าง Real-world:**
```
งานทำความสะอาด: ฿2,000
ลูกค้าชำระ: ฿1,000 (วันแรก)
→ Status: Partial, Payment Method: Cash

ลูกค้ามาชำระเพิ่มเติม: ฿1,000
→ Status: Paid ✅
```

#### 8. การลบและการกู้คืนข้อมูล (Delete & Restore)

**โปรดเข้าใจความแตกต่าง:**

| ประเภท | ความหมาย | กู้คืนได้? | เวลา | ใครใช้ได้ |
|------|--------|-----------|------|---------|
| **Soft Delete (Archive)** | ซ่อนข้อมูล สามารถดูรายการที่ลบแล้ว | ✅ ได้ | เร็ว | Admin, Manager |
| **Hard Delete** | ลบถาวร ไม่มีการกู้คืน | ❌ ไม่ได้ | เร็ว | Admin เท่านั้น |

**วิธี Soft Delete (Archive):**

1. คลิกการจอง → "More Options"
2. เลือก "Archive"
3. ยืนยัน "Archive this booking?"
4. ✅ การจองถูกซ่อนจากรายชื่อปกติ

**วิธี Restore (กู้คืน):**

1. เลือก Filter: "Show Archived Bookings"
2. ค้นหาการจองที่ต้องการ
3. คลิก "Restore"
4. ✅ การจองกลับมาในรายชื่อปกติ

**วิธี Hard Delete (ลบถาวร):**

```
⚠️ สำหรับ Admin เท่านั้น
1. เปิดรายการ Archived Bookings
2. คลิก "Delete Permanently"
3. ยืนยัน "Delete permanently? (Cannot undo)"
4. ✅ ลบถาวร (ไม่มีการกู้คืน)
```

💡 **Best Practice:**
```
ทำ Soft Delete (Archive) เสมอ:
- ปลอดภัย สามารถกู้คืน
- เก็บบันทึกประวัติ

Hard Delete ใช้ในกรณี:
- ข้อมูลที่สำคัญต้องลบถาวร
- เป็น Admin เท่านั้น
```

---

## 3.3 Calendar - ปฏิทินการจอง

### ภาพรวม

ปฏิทิน (`/admin/calendar`) แสดงการจองแบบภาพ Timeline ช่วยในการจัดการและเห็นภาพรวม

### การดูปฏิทินแบบต่างๆ

**3 โหมดแสดงผล:**

| โหมด | ตัวอักษร | ประโยชน์ |
|-----|---------|---------|
| **Month** | ปฏิทินรายเดือน | ดูภาพรวมทั้งเดือน |
| **Week** | ตารางรายสัปดาห์ | ดูรายละเอียดเดือ |
| **Day** | ตารางรายวัน | ดูรายละเอียดชั่วโมง |

**วิธีสลับโหมด:**
- ปุ่ม "Month / Week / Day" ที่หัวปฏิทิน
- หรือใช้ Keyboard: `M` (Month), `W` (Week), `D` (Day)

### การสร้าง/แก้ไขการจองจากปฏิทิน

**สร้างการจองใหม่:**

1. **Month View:**
   - Click วันที่ต้องการ
   - Modal สร้างการจองเปิด
   - ป้อนข้อมูลตามปกติ

2. **Week View:**
   - Click Timeslot (ชั่วโมงที่ว่าง)
   - Modal สร้าง + เวลาตั้งอัตโนมัติ

3. **Day View:**
   - Click ชั่วโมงที่ต้องการ
   - Modal สร้าง + เวลา + วันที่ตั้งอัตโนมัติ

**Drag to Adjust Time:**

1. **ลองคลิก-ลาก (Drag) ที่ขอบการจอง:**
   ```
   ┌─────────────────────┐
   │ ทำความสะอาด       │ ← Drag ขอบเพื่อขยาย/ลดเวลา
   │ 10:00 - 11:30     │
   └─────────────────────┘
   ```

2. **ลองคลิก-ลาก (Drag) ที่ช่วงการจอง:**
   - Drag ทั้งบล็อก = เลื่อนเวลา

**ตัวอย่าง:**
```
Original: 10:00 - 11:30
Drag down to 11:00 - 12:30
→ ระบบอัพเดตอัตโนมัติ
```

### การกรองตามพนักงาน/ทีม/สถานะ

**Sidebar Filters:**

```
📍 Filter by:
┌──────────────────────┐
│ ☐ สมชาย              │ Staff
│ ☐ ลินดา              │ Staff
│ ☐ Team A             │ Team
│ ☐ Team B             │ Team
└──────────────────────┘

📍 Status Filter:
┌──────────────────────┐
│ ☑️ Pending           │
│ ☑️ Confirmed         │
│ ☑️ In Progress       │
│ ☑️ Completed         │
│ ☐ Cancelled          │
└──────────────────────┘
```

**Color-coded Status (สีตามสถานะ):**

| สถานะ | สี | ความหมาย |
|------|-----|--------|
| Pending | 🟡 เหลือง | รอการยืนยัน |
| Confirmed | 🟢 เขียว | ยืนยันแล้ว |
| In Progress | 🔵 น้ำเงิน | กำลังทำ |
| Completed | ⚪ ขาว/เทา | เสร็จสิ้น |
| Cancelled | ⚫ ดำ | ยกเลิก |

**วิธีใช้:**
1. เลือก Staff/Team ที่ต้องการ
2. เลือก Status ที่ต้องการ
3. ปฏิทินอัพเดตแสดงเฉพาะรายการที่เลือก

**ตัวอย่าง:**
```
ต้องการดูงานที่กำลังทำของสมชาย:
1. ☑️ สมชาย
2. ☑️ In Progress (uncheck ตัวอื่น)
→ ปฏิทินแสดงเฉพาะงานของสมชายที่ In Progress
```

### การใช้งานบนมือถือ (Mobile Calendar)

**บน Mobile/Tablet:**

- **Swipe Navigation:** ปัดซ้าย/ขวา = เปลี่ยนวัน/สัปดาห์
- **Responsive Design:** ปฏิทินยืดหยุ่นตามขนาดจอ
- **Touch-friendly:** ขนาดช่องเพิ่มขึ้นเพื่อให้ดัน/ลากได้ง่าย

**Best Practice on Mobile:**
```
💡 ใช้ Month View เพื่อดูภาพรวม
💡 Swipe ไปทีละวันแทนการลาก
```

---

## 3.4 Customers - การจัดการข้อมูลลูกค้า

### ภาพรวม

หน้า Customers (`/admin/customers`) ใช้ในการจัดการข้อมูลลูกค้าทั้งหมดของระบบ

### การเพิ่มลูกค้าใหม่

**ขั้นตอนการสร้าง:**

1. **คลิก "+ New Customer"**
   - Modal เปิด

2. **ป้อนข้อมูลพื้นฐาน:**
   ```
   ชื่อ (Name):           [           ]
   เบอร์โทรศัพท์ (Phone): [           ]
   อีเมล (Email):        [           ]
   ที่อยู่ (Address):     [           ]
   เมือง (City):         [           ]
   จังหวัด (State):      [           ]
   รหัสไปรษณีย์ (Zip):   [           ]
   ```

3. **อัพโหลด Avatar (รูปโปรไฟล์) - Optional:**
   - คลิก "Upload Avatar"
   - เลือกรูปภาพ
   - ระบบอัพโหลดไป Supabase Storage

4. **สำเร็จ:**
   - คลิก "Save"
   - ระบบบันทึก ลูกค้ากำหนดหมายเลข ID

**ตัวอย่าง:**
```
Name:     สมชาย โสภณ
Phone:    081-234-5678
Email:    somchai@example.com
Address:  123 ซอยลัดดาวัล
City:     กรุงเทพมหานคร
State:    (ว่าง)
Zip:      10110
→ ✅ บันทึก ได้ลูกค้า ID: CUST00234
```

### การค้นหาและกรองลูกค้า

**ค้นหา (Search):**

```
🔍 ค้นหา: [              ]
→ ชื่อ: "สมชาย" → หาผู้ที่ชื่อประกอบ
→ โทร: "081-234" → หาผู้ที่เบอร์ประกอบ
→ Email: "somchai" → หาผู้ที่อีเมลประกอบ
```

**กรองตาม Tags:**

```
📍 Filter by Tags:
┌──────────────────────┐
│ ☐ VIP                │
│ ☐ Regular            │
│ ☐ One-time           │
│ ☐ Premium            │
│ ☐ Discount 10%       │
└──────────────────────┘
```

**ตัวอย่าง:**
```
ต้องการติดต่อลูกค้า VIP เดือนนี้:
1. Filter: ☑️ VIP
2. Search: (ว่าง)
→ แสดงรายชื่อลูกค้า VIP ทั้งหมด
```

### การจัดการ Tags (VIP, Regular, One-time)

**Tags มีประโยชน์:**
- 🏆 VIP = ลูกค้าสำคัญ
- 👤 Regular = ลูกค้าประจำ
- 🎁 One-time = ลูกค้าครั้งแรก
- 💎 Premium = ลูกค้าสูงสุด
- (สามารถสร้าง Tag เองได้)

**วิธี Add/Remove Tags:**

1. **จากรายชื่อ (List):**
   - Hover ลูกค้า → ปุ่ม "Edit Tags"
   - เลือก Tag ที่ต้องการ
   - ☑️ VIP, ☑️ Premium
   - Save

2. **จากรายละเอียด (Detail Page):**
   - เปิด Customer Detail
   - ส่วน "Tags" → คลิก "Edit"
   - เลือก/ยกเลิก Tag
   - Save

### การดูรายละเอียดลูกค้า (Customer Detail Page)

**URL:** `/admin/customers/:id`

**ส่วนประกอบหลัก:**

#### 1. ข้อมูลลูกค้า (Customer Info)

```
┌─────────────────────────────────┐
│ [Avatar]                        │
│ ชื่อ: สมชาย โสภณ               │
│ โทร: 081-234-5678               │
│ Email: somchai@example.com      │
│ ที่อยู่: 123 ซอยลัดดาวัล...    │
│ Tags: VIP, Premium              │
└─────────────────────────────────┘
```

**การแก้ไข:**
- คลิก "Edit" → แก้ไขช่องต่างๆ → Save

#### 2. ประวัติการจองแยกตามสถานะ (Booking History by Status)

```
📊 Booking Statistics:
├─ Completed: 15 นัด
├─ In Progress: 2 นัด
├─ Confirmed: 1 นัด
├─ Pending: 0 นัด
└─ Cancelled: 3 นัด
```

**ตาราประวัติ:**

| วันที่ | บริการ | เวลา | สถานะ | ราคา |
|------|------|------|------|------|
| 08/01/2025 | ทำความสะอาด | 10:00 | ✅ Completed | ฿2,000 |
| 07/01/2025 | ซ่อมท่อ | 14:00 | ✅ Completed | ฿1,500 |

**การทำงาน:**
- คลิก Tab "Completed / Pending / In Progress" เพื่อกรอง
- ลิสต์ของการจองแสดงด้านล่าง
- คลิกการจอง = เปิด Detail Modal

#### 3. กลุ่มการจองซ้ำ (Recurring Booking Groups)

```
🔄 Recurring Bookings:
├─ ทำความสะอาด (Weekly, Fridays)
│  ├─ 10 Jan 2025
│  ├─ 17 Jan 2025
│  ├─ 24 Jan 2025
│  └─ 31 Jan 2025
└─ ปรึกษา (Monthly, 1st Monday)
   ├─ 06 Jan 2025
   ├─ 03 Feb 2025
   └─ 03 Mar 2025
```

**การจัดการ:**
- ดูทั้งกลุ่มซ้ำ
- แก้ไข/ลบทั้งกลุ่ม
- แก้ไขรายการเดียว

#### 4. แผนภูมิการวิเคราะห์ (Analytics Charts)

**Chart 1: Total Bookings (ทั้งหมด)**
- บาร์ชาร์ท: สำเร็จ vs ยกเลิก
- ตัวอย่าง: 20 สำเร็จ, 3 ยกเลิก

**Chart 2: Revenue Breakdown (รายได้)**
- ตัวอย่าง: "฿42,000 รวม"
- Paid: ฿40,000
- Unpaid: ฿2,000

**Chart 3: Repeat Rate (อัตราการจองซ้ำ)**
- ตัวอย่าง: "67% ลูกค้าจองซ้ำ"

**Chart 4: Monthly Trend (แนวโน้มรายเดือน)**
- Line Chart: รายได้เทียบเดือน

### ประวัติการจองของลูกค้า

**แสดงในส่วน "Booking History":**

- ทั้งหมด 20+ การจองสำหรับลูกค้านี้
- แสดงช่วง: ล่าสุด 50 การจองแรก
- Pagination: ถัดไป, ก่อนหน้า

**Filter:**
- Status: All, Completed, Pending, In Progress, Cancelled
- Date: ทั้งหมด, 7 วันล่าสุด, 30 วันล่าสุด, 3 เดือนล่าสุด

### การวิเคราะห์ข้อมูลลูกค้า (Customer Analytics)

**4 เมตริกหลัก:**

| เมตริก | ความหมาย | ตัวอย่าง |
|-------|--------|--------|
| Total Bookings | จำนวนการจองทั้งหมด | 25 นัด |
| Repeat Rate | เปอร์เซ็นต์ที่จองซ้ำ | 80% |
| Lifetime Value | รายได้รวมจากลูกค้า | ฿85,000 |
| Avg. Booking Value | ราคาเฉลี่ยต่อการจอง | ฿3,400 |

**ประโยชน์ของการวิเคราะห์:**
- ตัดสินใจเสริม VIP
- ทำความเข้าใจลูกค้าไหล (churn rate)
- วางแผนโปรโมชัน

### การติดต่อลูกค้า (Quick Actions)

```
📞 Call          → โทรไปยังลูกค้า (ขึ้นอยู่กับโปรแกรมค่อย)
💬 Message       → ส่ง SMS/WhatsApp
📧 Email         → ส่งอีเมล
🗺️  Maps/Location → ดูที่อยู่บน Google Maps
```

**ตัวอย่าง:**
```
1. เปิด Customer Detail
2. คลิก "☎️ Call"
3. โปรแกรมโทรศัพท์เปิด
4. บันทึกการโทร
```

---

## 3.5 Staff - การจัดการพนักงาน

### ภาพรวม

หน้า Staff (`/admin/staff`) ใช้ในการจัดการข้อมูลพนักงานทั้งหมด

### การเพิ่มพนักงานใหม่

**ขั้นตอน:**

1. **คลิก "+ New Staff"**
   - Modal เปิด

2. **ป้อนข้อมูลพื้นฐาน:**
   ```
   Full Name:      [              ]
   Email:          [              ]
   Password:       [              ]  (auto-generate)
   Phone:          [              ]
   ```

3. **ระบบจะสร้างอัตโนมัติ:**
   - **Staff Number:** STF0001, STF0002, ... (auto-increment)
   - **Auth Account:** สร้างบัญชี Supabase Auth
   - **Profile:** บันทึกใน profiles table

4. **ผลลัพธ์:**
   ```
   ✅ Staff Created

   ชื่อ:          สมชาย โสภณ
   Staff Number:  STF0023
   Email:         somchai@tinedy.com
   Password:      (แสดงครั้งเดียวให้บันทึก)
   ```

**โปรดจดบันทึก:**
- ✍️ บันทึก Staff Number ไว้
- ✍️ บันทึก Password ไว้
- ✍️ แจกให้พนักงานทราบ

### การกำหนดทักษะ (Skills Assignment)

**Predefined Skill List:**

```
✓ ทำความสะอาด (Cleaning)
✓ ซ่อมน้ำ (Plumbing)
✓ ซ่อมไฟฟ้า (Electrical)
✓ ตัดแต่งหญ้า (Landscaping)
✓ ปรึกษา (Consultation)
✓ อื่นๆ
```

**วิธี Add/Remove Skills:**

1. **เปิด Staff Detail Page:**
   - `/admin/staff/:id`

2. **ส่วน "Skills":**
   ```
   ☐ ทำความสะอาด
   ☑️ ซ่อมน้ำ
   ☑️ ซ่อมไฟฟ้า
   ☐ ตัดแต่งหญ้า
   ☐ ปรึกษา
   ```

3. **ทำการเลือก/ยกเลิก:**
   - ☑️ = มีทักษะ
   - ☐ = ไม่มีทักษะ
   - Save

**ตัวอย่าง:**
```
สมชาย มีทักษะ:
- ซ่อมน้ำ
- ซ่อมไฟฟ้า

ลินดา มีทักษะ:
- ทำความสะอาด
- ปรึกษา
```

### การดูประสิทธิภาพพนักงาน (Staff Performance Page)

**URL:** `/admin/staff/:id`

**ส่วนประกอบ:**

#### 1. ข้อมูลพนักงาน (Staff Info)

```
┌────────────────────────────┐
│ Staff Number: STF0023      │
│ Name: สมชาย โสภณ          │
│ Email: somchai@tinedy.com  │
│ Phone: 081-234-5678        │
│ Skills: ซ่อมน้ำ, ซ่อมไฟ   │
│ Status: Active             │
└────────────────────────────┘
```

#### 2. เมตริกประสิทธิภาพ (Performance Metrics)

| เมตริก | ความหมาย | ตัวอย่าง |
|-------|--------|--------|
| **Completion Rate** | เปอร์เซ็นต์งานสำเร็จ | 92% |
| **Total Earnings** | รายได้รวม | ฿45,000 |
| **Average Rating** | คะแนนเฉลี่ย | 4.8/5 ⭐ |
| **Jobs This Month** | งานในเดือนนี้ | 18 นัด |

#### 3. Monthly Trend Charts (แผนภูมิแนวโน้มรายเดือน)

**Chart 1: Earnings Over Time**
- Line Chart: รายได้ต่อเดือน (6 เดือนล่าสุด)

**Chart 2: Jobs Completed**
- Bar Chart: จำนวนงานต่อเดือน

**Chart 3: Performance Rating**
- Line Chart: คะแนนเฉลี่ยต่อเดือน

#### 4. Recent Bookings (การจองล่าสุด)

```
วันที่    | บริการ      | สถานะ    | ราคา
---------|-----------|----------|--------
08/01    | ทำความสะอาด | ✅ Done  | ฿2,000
07/01    | ซ่อมท่อ    | ✅ Done  | ฿1,500
06/01    | ซ่อมไฟ    | ✅ Done  | ฿1,800
```

**รายการ 10 งานล่าสุด แสดง Status, Service, Booking Date**

### การจัดการเรตติ้งและรีวิว

**คะแนนเฉลี่ย (Average Rating):**
```
⭐⭐⭐⭐⭐ 4.8 / 5.0 (12 รีวิว)
```

**รีวิวล่าสุด:**
```
⭐⭐⭐⭐⭐ 5 (08/01/2025)
"สมชายซ่อมท่อน้ำได้สวยมาก ทำงานอย่างรวดเร็ว"
- โดย: ลูกค้า: สมชาย

⭐⭐⭐⭐☆ 4 (07/01/2025)
"ซ่อมไฟได้ดี แต่มาช้าเล็กน้อย"
- โดย: ลูกค้า: สมชาย
```

### การลบพนักงาน

**⚠️ สำคัญ: Hard Delete เท่านั้น**

```
🚨 Hard Delete: ลบถาวร
→ ไม่สามารถกู้คืนได้
→ Admin เท่านั้น
```

**วิธี:**

1. **เปิด Staff Detail Page**
2. **เลือก "More Options"**
3. **คลิก "Delete Staff"**
4. **ยืนยัน:**
   ```
   ⚠️ Delete this staff permanently?
   This action cannot be undone.

   ☐ I confirm (ต้องติ๊ก)
   [Cancel] [Delete]
   ```
5. **ลบแล้ว:**
   ```
   ✅ Staff deleted
   → พนักงานหายจากระบบ
   → ไม่มีการกู้คืน
   ```

💡 **Best Practice:**
```
ถ้าพนักงานออกจาก:
→ ลบ (Hard Delete) ได้เลย
→ ไม่ต้อง Soft Delete

ถ้าอยากเก็บบันทึก:
→ ใช้ Soft Delete
→ แต่ระบบปัจจุบันใช้ Hard Delete
```

---

## 3.6 Teams - การจัดการทีม

### ภาพรวม

หน้า Teams (`/admin/teams`) ใช้ในการจัดการทีมพนักงาน

### การสร้างทีมใหม่

**ขั้นตอน:**

1. **คลิก "+ New Team"**
   - Modal เปิด

2. **ป้อนข้อมูล:**
   ```
   Team Name:        [                    ]
   Team Description: [                    ]
   ```

3. **ตัวอย่าง:**
   ```
   Team Name:        Team A - Cleaning
   Description:      ทีมทำความสะอาดระดับประเทศ
   ```

4. **บันทึก:**
   - ✅ ทีมสร้างเสร็จ
   - ทีมได้ ID ใหม่

### การมอบหมายหัวหน้าทีม (Team Lead)

**Team Lead มีบทบาท:**
- 👤 ผู้นำทีม
- 📋 ทำรายงาน
- 🏆 อื่นๆ (ขึ้นอยู่กับนโยบาย)

**วิธี Designate Team Lead:**

1. **เปิด Team Detail Page:**
   - `/admin/teams/:teamId`

2. **ส่วน "Team Lead":**
   ```
   ☐ สมชาย
   ☑️ ลินดา (Current Lead)
   ☐ สวีย
   ☐ มายา
   ```

3. **เลือกหัวหน้าใหม่:**
   - Click ☐ คนที่ต้องการ
   - ✅ บันทึกอัตโนมัติ

### การเพิ่ม/ลบสมาชิกทีม

**การเพิ่มสมาชิก (Add Members):**

1. **ส่วน "Team Members":**
   ```
   ☑️ สมชาย  (Joined: 01/01/2025)
   ☑️ ลินดา  (Joined: 01/01/2025, Lead)
   ☐ สวีย   (Available)
   ☐ มายา   (Available)
   ```

2. **เลือกสมาชิกที่ต้องการ:**
   - ☑️ สวีย
   - ✅ บันทึก

3. **ผลลัพธ์:**
   ```
   ✅ สวีย added to Team A
   Joined: 08/01/2025
   ```

**การลบสมาชิก (Remove Members):**

1. **Hover สมาชิก:**
   - ปุ่ม "Remove" ปรากฏ

2. **คลิก "Remove":**
   ```
   ⚠️ Remove สวีย from Team A?

   [Cancel] [Remove]
   ```

3. **ลบแล้ว:**
   ```
   ✅ สวีย removed
   Left at: 08/01/2025
   (บันทึก left_at timestamp)
   ```

### การดูประสิทธิภาพทีม (Team Detail Page)

**URL:** `/admin/teams/:teamId`

**ส่วนประกอบ:**

#### 1. สถิติทีม (Team Stats)

```
┌─────────────────────────────┐
│ Team: Team A - Cleaning     │
│ ────────────────────────── │
│ Jobs This Month: 45        │
│ Revenue: ฿156,000          │
│ Avg. Rating: 4.6 ⭐        │
│ Member Count: 4            │
└─────────────────────────────┘
```

#### 2. รายชื่อสมาชิก (Member List)

```
| Name    | Role | Status | Earnings | Rating |
|---------|------|--------|----------|--------|
| ลินดา   | Lead | Active | ฿45,000  | 4.8⭐  |
| สมชาย   | -    | Active | ฿38,000  | 4.6⭐  |
| สวีย    | -    | Active | ฿35,000  | 4.7⭐  |
| มายา    | -    | Active | ฿38,000  | 4.5⭐  |
```

#### 3. แผนภูมิประสิทธิภาพ (Performance Charts)

**Chart 1: Team Performance Over Time**
- Line Chart: รายได้/เดือน

**Chart 2: Member Comparison**
- Bar Chart: รายได้ของสมาชิก

**Chart 3: Rating Trend**
- Line Chart: คะแนนเฉลี่ย/เดือน

#### 4. การจองล่าสุด (Recent Team Bookings)

```
วันที่ | ลูกค้า | บริการ | สมาชิก | สถานะ | ราคา
------|--------|--------|--------|------|------
08/01 | สมชาย | ทำความสะอาด | สมชาย | ✅ | ฿2,000
08/01 | สมหมาย | ซ่อมท่อ | ลินดา | ✅ | ฿1,500
```

### การมอบหมายงานให้ทีม

**วิธี:**

1. **สร้างการจอง:**
   - เลือก "Assign to Team"
   - ☑️ Team A

2. **ผลลัพธ์:**
   ```
   ✅ Booking created
   Team: Team A
   Visible to: ลินดา, สมชาย, สวีย, มายา
   ```

3. **สมาชิกเห็น:**
   - ทุกคนในทีมเห็นการจองนี้
   - สามารถอัพเดตสถานะทั้งหมด

---

## 3.7 Service Packages - การจัดการแพ็คเกจบริการ

### ภาพรวม

หน้า Packages (`/admin/packages`) ใช้ในการจัดการแพ็คเกจบริการ (Service Packages)

### ความแตกต่าง V1 vs V2

**V1 (Legacy):**
- ❌ ล้าสมัย (Deprecated)
- ⚙️ ราคาคงที่
- 📦 1 ราคา = 1 บริการ

**V2 (Current):**
- ✅ ใหม่ (Recommended)
- 💰 ราคาแบบระดับ (Tiered Pricing)
- 🎯 Small, Medium, Large ราคาต่างกัน
- 📊 Advanced Tracking

**โปรดใช้ V2 เสมอสำหรับแพ็คเกจใหม่**

### การสร้างแพ็คเกจใหม่ (V2)

**ขั้นตอน:**

1. **คลิก "+ New Package"**
   - Modal เปิด

2. **ป้อนข้อมูลพื้นฐาน:**
   ```
   Package Name:    [                ]
   Description:     [                ]
   Category:        [dropdown ▼     ]
   Available:       [☑️ Yes / ☐ No ]
   ```

3. **เลือก Category:**
   ```
   ✓ Cleaning (ทำความสะอาด)
   ✓ Repair (ซ่อมแซม)
   ✓ Consultation (ปรึกษา)
   ✓ Maintenance (บำรุงรักษา)
   ✓ Other (อื่นๆ)
   ```

4. **ตัวอย่าง:**
   ```
   Package Name:    Room Cleaning Deluxe
   Description:     ทำความสะอาดห้องพัก แบบหรูหรา
   Category:        Cleaning
   Available:       ☑️ Yes
   ```

### การกำหนดราคาแบบ Tiered

**3 ระดับขนาด:**

| ระดับ | Tier | ระยะเวลา | ราคา | ตัวอย่าง |
|------|------|---------|------|---------|
| เล็ก | Small | 30 นาที | ฿500 | 1 ห้อง |
| กลาง | Medium | 60 นาที | ฿1,000 | 2-3 ห้อง |
| ใหญ่ | Large | 90 นาที | ฿1,500 | 4+ ห้อง |

**วิธีตั้งค่า:**

1. **Pricing Tiers Section:**
   ```
   ┌─ Small ─────────────────┐
   │ Duration: [30] minutes  │
   │ Price: [500] THB        │
   │ [Edit] [Remove]         │
   └─────────────────────────┘

   ┌─ Medium ────────────────┐
   │ Duration: [60] minutes  │
   │ Price: [1000] THB       │
   │ [Edit] [Remove]         │
   └─────────────────────────┘

   ┌─ Large ─────────────────┐
   │ Duration: [90] minutes  │
   │ Price: [1500] THB       │
   │ [Edit] [Remove]         │
   └─────────────────────────┘
   ```

2. **Save:**
   - ✅ Package created with tiers

### การจัดการหมวดหมู่บริการ

**Predefined Categories:**
```
✓ Cleaning
✓ Repair
✓ Consultation
✓ Maintenance
✓ Other
```

**ถ้าต้องการหมวดหมู่เพิ่ม:**
- ติดต่อ Admin
- อัพเดต Database Schema
- เพิ่มใน Dropdown Options

### การติดตามการใช้งานแพ็คเกจ

**ในหน้า Packages List:**

```
| Package Name | Category | Bookings | Revenue | Status |
|--------------|----------|----------|---------|--------|
| Cleaning M   | Cleaning | 25       | ฿25,000 | Active |
| Repair A/C   | Repair   | 8        | ฿12,000 | Active |
| Consult      | Consult  | 5        | ฿5,000  | Inactive|
```

**Bookings per Package:**
```
Room Cleaning Deluxe:
- Small: 10 นัด
- Medium: 20 นัด
- Large: 5 นัด
→ Total: 35 นัด
```

**Revenue per Package:**
```
Room Cleaning Deluxe:
- Small: 10 × ฿500 = ฿5,000
- Medium: 20 × ฿1,000 = ฿20,000
- Large: 5 × ฿1,500 = ฿7,500
→ Total: ฿32,500
```

### ระบบแพ็คเกจเติมเงินล่วงหน้า (Prepaid Credits)

**Prepaid Packages:**
```
✓ 5 Sessions = ฿4,500 (ประหยัด ฿500)
✓ 10 Sessions = ฿8,500 (ประหยัด ฿1,500)
✓ Monthly = ฿9,999 (Unlimited)
```

**การติดตาม:**
1. **ลูกค้าซื้อ Prepaid:**
   - ฉบับบันทึก 5 Sessions เก็บไว้

2. **ใช้งาน:**
   - ทุกครั้งที่จอง → Sessions -1
   - Tracking: Sessions ที่เหลือ

3. **หมดแล้ว:**
   - ฉบับแจ้ง "Prepaid package expired"
   - ลูกค้าต้องซื้อใหม่

### Package Detail Page

**URL:** `/admin/packages/:packageId`

**ส่วนประกอบ:**

#### 1. Package Info and Pricing Tiers

```
Room Cleaning Deluxe
ทำความสะอาดห้องพัก แบบหรูหรา

Category: Cleaning
Status: ✅ Active

Pricing Tiers:
├─ Small: 30 min, ฿500
├─ Medium: 60 min, ฿1,000
└─ Large: 90 min, ฿1,500
```

#### 2. Usage Statistics

```
Total Bookings: 35
- Small: 10
- Medium: 20
- Large: 5

Total Revenue: ฿32,500
```

#### 3. Recent Bookings

```
วันที่ | ลูกค้า | Tier | สถานะ | ราคา
------|--------|------|------|------
08/01 | สมชาย | Med | ✅ | ฿1,000
07/01 | สมหมาย | Sml | ✅ | ฿500
```

#### 4. Revenue Breakdown

**Pie Chart:**
```
Small (30%): ฿9,750
Medium (62%): ฿20,000
Large (8%): ฿2,750
```

---

## 3.8 Reports & Analytics - รายงานและการวิเคราะห์

### ภาพรวม

หน้า Reports (`/admin/reports`) ใช้ในการดูรายงานและการวิเคราะห์ลึกซึ้ง

### 4 แท็บหลัก

#### Tab 1: Revenue Report

**ประเภท:** Line Chart + Numbers

**ข้อมูล:**
- รายได้ตามวันที่
- Total Revenue = ฿X,XXX

**Date Range Filter:**
```
[Today] [This Week] [This Month] [This Year] [Custom Date]
```

**ตัวอย่าง:**
```
This Month (Jan 2025):
- 01/Jan: ฿30,000
- 02/Jan: ฿35,000
- 03/Jan: ฿28,000
...
Total: ฿750,000
```

**ประโยชน์:**
- ตรวจสอบแนวโน้มรายได้
- วางแผนทางการเงิน
- ตัดสินใจเสริมหรือลดการตลาด

#### Tab 2: Customer Analytics

**ประเภท:** Various Charts

**Section 1: Top Customers**

```
| Rank | Name | Bookings | Total Spent | Repeat % |
|------|------|----------|-------------|----------|
| 1 | สมชาย | 20 | ฿68,000 | 100% |
| 2 | สมหมาย | 15 | ฿45,000 | 87% |
| 3 | ลิ | 12 | ฿35,000 | 75% |
```

**Section 2: Repeat Rate**

```
New Customers: 15 (30%)
Repeat Customers: 35 (70%)
→ 70% ของลูกค้ากลับมาจองใหม่ ✅
```

**Section 3: Customer Lifetime Value**

```
Average CLV: ฿42,000
Highest CLV: ฿150,000 (สมชาย)
Lowest CLV: ฿1,000

Distribution:
< ฿10,000: 20 ลูกค้า
฿10K-50K: 30 ลูกค้า
> ฿50,000: 5 ลูกค้า
```

**Section 4: Customer Acquisition Trends**

```
Line Chart: New Customers per Month
Jan 2025: 15
Feb 2025: 18
Mar 2025: 22
→ เพิ่มขึ้นเนื่องจากการตลาด ✅
```

#### Tab 3: Staff Performance

**Metrics per Staff:**

```
| Staff | Bookings | Completion % | Rating | Earnings |
|-------|----------|-------------|--------|----------|
| สมชาย | 18 | 95% | 4.8⭐ | ฿45,000 |
| ลินดา | 22 | 92% | 4.6⭐ | ฿52,000 |
| สวีย | 15 | 88% | 4.5⭐ | ฿38,000 |
```

**Workload Distribution:**

```
ลินดา: 30% (22 jobs)
สมชาย: 25% (18 jobs)
สวีย: 20% (15 jobs)
อื่นๆ: 25% (18 jobs)
```

**Completion Rate Comparison:**

```
Bar Chart: Completion % per Staff
ลินดา: 92% ✅
สมชาย: 95% ✅✅
สวีย: 88%
```

**Earnings Breakdown:**

```
Line Chart: Earnings per Month
Jan: ฿120,000
Feb: ฿135,000
Mar: ฿142,000 ✅
```

#### Tab 4: Team Metrics

**Team Performance Comparison:**

```
| Team | Jobs | Revenue | Avg Rating | Members |
|------|------|---------|-----------|---------|
| Team A | 45 | ฿150,000 | 4.7⭐ | 4 |
| Team B | 38 | ฿125,000 | 4.5⭐ | 3 |
| Team C | 32 | ฿98,000 | 4.6⭐ | 3 |
```

**Team Workload:**

```
Pie Chart: % Jobs per Team
Team A: 40%
Team B: 35%
Team C: 25%
```

**Team Efficiency (Revenue per Member):**

```
Bar Chart: ฿/Member/Month
Team A: ฿37,500 ✅
Team B: ฿41,667 ✅✅
Team C: ฿32,667
```

### Export Functionality

**วิธี Export:**

1. **เลือก Report:**
   - Revenue / Customer / Staff / Team

2. **ตั้งค่าตัวกรอง:**
   - Date Range
   - Staff/Team (ถ้ามี)

3. **คลิก "Export":**
   - ตัวเลือก: CSV, Excel, PDF
   - Download

4. **ไฟล์ที่ได้:**
   ```
   tinedy_revenue_report_2025-01.csv
   tinedy_revenue_report_2025-01.xlsx
   tinedy_revenue_report_2025-01.pdf
   ```

**ตัวอย่าง CSV:**
```
date,revenue,completed,pending,cancelled
2025-01-08,30000,12,2,1
2025-01-07,28500,11,3,0
...
```

---

## 3.9 Chat - ระบบแชทภายใน

### ภาพรวม

ระบบ Chat (`/admin/chat`) ใช้สำหรับการสื่อสารแบบ Real-time ภายในสมาชิก

### การส่งข้อความ Real-time

**วิธี:**

1. **เลือกผู้ติดต่อ:**
   - Sidebar ด้านซ้าย: รายชื่อคนทั้งหมด
   - ค้นหา: "Search conversations"

2. **เปิด Chat:**
   - Click คนที่ต้องการพูดคุย
   - Chat window เปิด

3. **พิมพ์ข้อความ:**
   ```
   Message input: [                    ]
   [Attach] [Send] [Emoji]
   ```

4. **ส่งข้อความ:**
   - Click "Send" หรือ Press Enter
   - ข้อความถูกส่ง Real-time

**ตัวอย่าง:**
```
You (Admin): สมชาย ทำงานวันนี้ยังไงบ้าง
Somchai: ดีค่ะ สำเร็จ 5 งานแล้ว
You: ยอดเยี่ยม แบบนี้เป็นห้ามไปต่อ
Somchai: ขอบคุณครับ
```

**Instant Messaging Features:**
- ✅ Real-time updates
- ✅ ข้อความมาถึงทันที
- ✅ ไม่ต้อง Refresh

### Read Receipts

**ดูได้เมื่อ:**
- ข้อความถูกส่ง ✓
- ข้อความถูกอ่าน ✓✓

**ตัวอย่าง:**
```
You: สอบถามการจองเที่ยงนี้ ✓✓
     (✓✓ = อ่านแล้ว)

You: ตอบด้วยนะ ✓
     (✓ = ส่งแล้วแต่ยังไม่อ่าน)
```

### การแนบไฟล์และรูปภาพ

**Attachment Types:**

| ประเภท | ตัวอย่าง | ขีดจำกัด |
|-------|---------|---------|
| **Image** | JPG, PNG, WebP | 5 MB |
| **Document** | PDF, Word, Excel | 10 MB |
| **Payment Slip** | Image/PDF | 5 MB |

**วิธี Attach:**

1. **Click "[Attach]" button:**
   - Attach Image
   - Attach Document
   - Attach Payment Slip

2. **เลือกไฟล์:**
   - Choose from computer

3. **Upload:**
   - File uploads to Supabase Storage
   - Preview appears in chat

4. **ส่งข้อความพร้อม Attachment:**
   ```
   Message: "ดูสลิปชำระเงินด้านล่าง"
   Attachment: payment_slip_2025-01-08.pdf
   [Send]
   ```

**ตัวอย่าง Image in Chat:**
```
You: ส่งรูปที่อยู่โครงการ
[Image: 1200x800, 2.3 MB]
→ รูปแสดงใน chat
→ Click เพื่อดูเต็มจอ
```

### การจัดการบทสนทนา

**User List (Conversations):**

```
Sidebar:
┌────────────────────┐
│ 🔍 Search users    │
├────────────────────┤
│ 📌 สมชาย      🔴 3 │ (3 unread)
│ 📌 ลินดา      🔴 5 │ (5 unread)
│ 📌 สวีย            │ (read all)
│ 📌 มายา       🔴 2 │ (2 unread)
└────────────────────┘
```

**ฟีเจอร์:**

- **Search conversations:**
  ```
  🔍 [Search...]
  → ค้นหาชื่อคน
  ```

- **Delete conversation:**
  ```
  Right-click chat
  → Delete conversation
  ⚠️ ข้อความทั้งหมดจะลบ
  ```

- **Mute notifications (Optional):**
  ```
  Right-click chat
  → Mute notifications
  ```

### Unread Count Badges

**Badge System:**

```
Sidebar:
├─ สมชาย       🔴 3    (3 unread messages)
├─ ลินดา       🔴 5    (5 unread)
├─ สวีย             (0 unread)
└─ มายา       🔴 2    (2 unread)
```

**คลิก Chat เพื่อมาร์ก as Read:**
- เปิด Chat → ข้อความมาร์ก as Read
- Badge หายไป

### File Storage Integration

**Supabase Storage:**

- **Bucket:** `/chat-attachments`
- **Path:** `/[user_id]/[date]/[filename]`
- **Size limits:** 5-10 MB per file
- **Retention:** Forever (no auto-delete)

**Supported Formats:**

| ประเภท | นามสกุล | ตัวอย่าง |
|-------|--------|---------|
| Image | .jpg, .png, .webp, .gif | photo.jpg |
| PDF | .pdf | invoice.pdf |
| Office | .docx, .xlsx, .pptx | contract.docx |
| Text | .txt, .csv | data.csv |

---

## 3.10 Settings - การตั้งค่าระบบ

### สำคัญ: Admin เท่านั้น

```
🔐 **ADMIN ONLY PAGE**
Manager ไม่สามารถแก้ไขได้
```

### 2 แท็บหลัก

#### Tab 1: General Settings

**Business Information:**

```
┌─────────────────────────────────────┐
│ Business Name:   [                ]  │
│ Email:           [                ]  │
│ Phone:           [                ]  │
│ Address:         [                ]  │
│ Description:     [                ]  │
│ Logo:            [Upload Image]      │
└─────────────────────────────────────┘
```

**ตัวอย่าง:**
```
Business Name:   Tinedy Home Services
Email:           admin@tinedy.com
Phone:           02-1234-5678
Address:         123 Sukhumvit Rd, Bangkok 10110
Description:     ให้บริการทำความสะอาดและซ่อมแซมที่บ้าน
Logo:            [tinedy_logo.png] ✅
```

**วิธีแก้ไข:**

1. **Click field ที่ต้องแก้:**
   - Textbox ถูก Enable เพื่อแก้ไข

2. **ป้อนข้อมูลใหม่:**
   ```
   Business Name: [Tinedy Home Services]
   ```

3. **Logo Upload:**
   - Click "[Upload Image]"
   - เลือกไฟล์ .png, .jpg
   - Upload ไป Supabase Storage

4. **Save:**
   - Click "Save Settings"
   - ✅ Saved

#### Tab 2: Payment Settings

**Payment Gateway Configuration:**

```
┌──────────────────────────────────────┐
│ Enable Payment Methods:              │
├──────────────────────────────────────┤
│ ☑️ Stripe                            │
│    API Key: [stripe_key_****]        │
│    Secret: [stripe_secret_****]      │
│                                      │
│ ☑️ Omise                             │
│    API Key: [omise_key_****]         │
│    Secret: [omise_secret_****]       │
│                                      │
│ ☑️ PromptPay                         │
│    Merchant ID: [merchant_****]      │
│                                      │
│ ☐ Other                              │
│    (Add custom payment gateway)       │
└──────────────────────────────────────┘
```

**Stripe Setup:**

1. **ได้ API Keys จาก:**
   - https://dashboard.stripe.com/apikeys

2. **ป้อนใน Settings:**
   - API Key (Publishable): pk_live_...
   - Secret Key: sk_live_...

3. **Test:**
   - Click "Test Connection"
   - ✅ Connected

**Omise Setup:**

```
1. สมัครที่ https://omise.co
2. ได้ API Key
3. ป้อนใน Settings
4. Test Connection ✅
```

**PromptPay Setup:**

```
1. ใช้หมายเลข 10 หลัก หรือ 13 หลัก
2. ป้อน Merchant ID
3. ลูกค้าสแกน QR Code เพื่อชำระ
```

**Manager Limitations:**

```
🔒 Manager:
├─ ☑️ View Settings (อ่านได้)
├─ ❌ Edit (แก้ไขไม่ได้)
└─ ❌ Delete (ลบไม่ได้)

🔑 Admin:
├─ ☑️ View Settings
├─ ☑️ Edit (แก้ไขได้)
└─ ☑️ Delete (ลบได้)
```

**Payment Methods Enable/Disable:**

```
Currently Enabled:
☑️ Cash
☑️ Credit Card
☑️ Bank Transfer
☑️ PromptPay
☐ Cryptocurrency

Click to toggle on/off
```

**Best Practice:**
```
1. ตั้งค่า Payment Gateway ที่ลูกค้าใช้บ่อย
2. Test ให้แน่ใจก่อน Go Live
3. บันทึก API Keys ไว้ที่ปลอดภัย
4. อัพเดต Settings ทุกครั้งที่เปลี่ยน Merchant
```

---

## 3.11 Profile - จัดการโปรไฟล์

### ภาพรวม

หน้า Profile (`/admin/profile`) ใช้ในการแก้ไขข้อมูลส่วนตัว

### การแก้ไขข้อมูลส่วนตัว

**ส่วน Personal Information:**

```
┌────────────────────────────────┐
│ Full Name:      [              ] │
│ Email:          [              ] │
│ Phone Number:   [              ] │
│ Avatar:         [Upload Photo]   │
│ Current Role:   Admin (Read-only)│
│ Staff Number:   STF0001 (R/O)   │
└────────────────────────────────┘
```

**วิธีแก้ไข:**

1. **Click field:**
   - Textbox ถูก Enable

2. **ป้อนข้อมูลใหม่:**
   ```
   Full Name: [สมชาย โสภณ]
   Phone Number: [081-234-5678]
   ```

3. **Avatar Upload:**
   - Click "[Upload Photo]"
   - เลือกรูปภาพ
   - ✅ Upload

4. **Save:**
   - Click "Save Profile"
   - ✅ Profile Updated

### การเปลี่ยนรหัสผ่าน

**ส่วน Change Password:**

```
┌──────────────────────────────────┐
│ Current Password:   [          ] │
│ New Password:       [          ] │
│ Confirm Password:   [          ] │
│                                  │
│ Password Strength:  ██████░░ 70% │
│ Requirements:      │
│ ☑️ At least 8 chars              │
│ ☑️ 1 uppercase letter            │
│ ☐ 1 number                       │
│ ☐ 1 special character            │
│                                  │
│ [Cancel] [Change Password]       │
└──────────────────────────────────┘
```

**วิธีเปลี่ยน:**

1. **ป้อน Current Password:**
   - ตรวจสอบเป็น Admin จริง

2. **ป้อน New Password:**
   - ต้อง 8 ตัวขึ้นไป
   - ต้องมี Uppercase
   - ต้องมี Number
   - ต้องมี Special char (!@#$%...)

3. **Confirm Password:**
   - ป้อนเหมือน New Password

4. **Submit:**
   - Click "Change Password"
   - ✅ Password Changed
   - Redirect to Login
   - Login ใหม่ด้วย New Password

**Password Strength Indicator:**

```
🔴 Very Weak:      ░░░░░░░░░░ 10%
🟠 Weak:           ███░░░░░░░ 40%
🟡 Fair:           █████░░░░░ 60%
🟢 Good:           ███████░░░ 80%
🟢 Very Strong:    ██████████ 100%
```

### Auto-save with Optimistic Updates

**Auto-save Features:**

```
📝 While you edit:
"Unsaved changes" badge appears

🚀 After you stop typing (1 second):
Automatic save starts
"Saving..." spinner shows

✅ When saved:
"Profile saved successfully" notification
Last updated: 2025-01-08 14:30
```

---

## Quick Tips สำหรับ Admin

### 💡 Best Practices

1. **Daily Routine:**
   ```
   ✅ Check Dashboard เมื่อมาทำงาน
   ✅ ดู Today's Appointments List
   ✅ ตรวจสอบ Payment Status (Unpaid)
   ✅ ดู Revenue Report
   ```

2. **Weekly Routine:**
   ```
   ✅ Review Staff Performance
   ✅ Check Team Metrics
   ✅ Export Reports
   ✅ Plan for next week
   ```

3. **Monthly Routine:**
   ```
   ✅ Analyze Customer Analytics
   ✅ Review Staff Earnings
   ✅ Check Payment Settings
   ✅ Plan promotional campaigns
   ```

### ⚠️ Common Mistakes to Avoid

| ❌ ผิด | ✅ ถูก |
|------|------|
| Hard Delete ตั้ง | Soft Delete ก่อน |
| Assign Staff AND Team | Assign Staff หรือ Team (ใดชนิดหนึ่ง) |
| ลืมตัวกรองการจอง | ใช้ Clear Filters |
| ยืนยัน Conflict | ทำตามคำแนะนำ |
| เพิ่ม Staff ทีลา | ได้ Staff มาก่อนแล้ว |

### 🎯 Keyboard Shortcuts (ถ้ามี)

```
Ctrl+S        Save changes
Ctrl+F        Search / Find
Ctrl+K        Command palette
M             Month view (Calendar)
W             Week view (Calendar)
D             Day view (Calendar)
```

### 📞 Support & Help

**ติดปัญหา:**
1. เช็ค [Glossary & Appendix](./10-appendix.md)
2. ดู [Manager FAQ](./04b-manager-faq.md) หรือ [Staff FAQ](./05b-staff-faq.md)
3. ดู [Staff Troubleshooting Guide](./05c-staff-troubleshooting.md)
4. ติดต่อ Development Team

---

## สรุป

เอกสารคู่มือ Admin ส่วนนี้ครอบคลุม:

✅ Dashboard - ภาพรวมการปฏิบัติงาน
✅ Bookings - การจัดการการจอง
✅ Calendar - ปฏิทินการจอง
✅ Customers - ข้อมูลลูกค้า
✅ Staff - จัดการพนักงาน
✅ Teams - จัดการทีม
✅ Service Packages - แพ็คเกจบริการ
✅ Reports - รายงานและการวิเคราะห์
✅ Chat - ระบบแชทภายใน
✅ Settings - ตั้งค่าระบบ
✅ Profile - จัดการโปรไฟล์

**ปัญหาใด ๆ: ติดต่อ Admin Support หรืออ่าน FAQ ด้านล่าง**

---

---

**Last Updated:** 10 มกราคม 2568
**Version:** 2.0 (Reorganized)
**Target Audience:** Admin (ผู้ดูแลระบบ)
**ส่วนที่ 3: Admin Guide** ← You are here
**ส่วนที่ 4-10: Manager Guide, Staff Guide, FAQ, Troubleshooting, Glossary, Appendix**
