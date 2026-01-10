# Tinedy CRM - Quick Reference Guide

คู่มืออ้างอิงด่วนสำหรับการใช้งาน Tinedy CRM ทั้ง 3 บทบาท

---

## 📋 Table of Contents

1. [Login & Access](#login--access)
2. [Role Overview](#role-overview)
3. [Permission Matrix](#permission-matrix)
4. [Quick Actions by Role](#quick-actions-by-role)
5. [Common Tasks](#common-tasks)
6. [Shortcuts & Tips](#shortcuts--tips)
7. [FAQ](#faq)
8. [Support](#support)

---

## 🔐 Login & Access

### URL เข้าถึง
```
https://tinedy-crm.vercel.app
```

### ขั้นตอนการ Login
1. ไปที่ URL ด้านบน
2. กรอก **Email** และ **Password** (ที่ Admin ให้)
3. คลิก **Sign In**
4. ระบบจะนำไปยัง Dashboard ตาม Role ของคุณ

### ลืมรหัสผ่าน?
ติดต่อ Admin เพื่อรีเซ็ตรหัสผ่าน

---

## 👥 Role Overview

### 🔴 Admin (ผู้ดูแลระบบ)
- **สิทธิ์:** ทั้งหมด (Full Access)
- **Route:** `/admin/*`
- **หน้าที่:** จัดการระบบทั้งหมด, ลบถาวร, ตั้งค่า, ดูรายงานการเงิน

### 🟡 Manager (ผู้จัดการปฏิบัติการ)
- **สิทธิ์:** สร้าง/อ่าน/อัพเดท, Soft Delete, Restore
- **Route:** `/admin/*`
- **หน้าที่:** จัดการการจอง ลูกค้า ทีม, ดูรายงาน (ไม่มี Settings/Hard Delete)

### 🟢 Staff (พนักงาน)
- **สิทธิ์:** ดูและอัพเดตสถานะงานของตนเอง
- **Route:** `/staff/*`
- **หน้าที่:** ดูการจองของตน อัพเดทสถานะ ใช้ Chat

---

## 📊 Permission Matrix

### สิทธิ์หลักของแต่ละบทบาท

| Feature | Admin | Manager | Staff | หมายเหตุ |
|---------|:-----:|:-------:|:-----:|----------|
| **Dashboard** | ✅ Full | ✅ Team Data | ✅ Own Data | Staff เห็นเฉพาะของตน |
| **Bookings** | ✅ CRUD | ✅ CRU + Soft Delete | ✅ Read + Update Status | Staff: งานที่ assigned เท่านั้น |
| **Customers** | ✅ CRUD | ✅ CRU + Soft Delete | ❌ | Staff: ดูผ่านการจองเท่านั้น |
| **Staff** | ✅ CRUD | ✅ Update Only | ✅ Own Profile | Admin เท่านั้นสร้าง/ลบได้ |
| **Teams** | ✅ CRUD | ✅ CRU + Soft Delete | ✅ View | - |
| **Packages** | ✅ CRUD | ✅ CRU + Soft Delete | ✅ View | - |
| **Reports** | ✅ Full | ✅ View/Export | ❌ | Admin เห็นการเงินเพิ่ม |
| **Chat** | ✅ | ✅ | ✅ | ทุกคนใช้ได้ |
| **Settings** | ✅ | ✅ Read Only | ❌ | Admin เท่านั้นแก้ไขได้ |
| **Hard Delete** | ✅ | ❌ | ❌ | ลบถาวร - Admin only |
| **Soft Delete** | ✅ | ✅ | ❌ | เก็บไว้ในArchive |
| **Restore** | ✅ | ✅ | ❌ | กู้คืนจาก Archive |
| **Export Data** | ✅ | ✅ | ❌ | CSV/PDF |

**Legend:**
✅ = อนุญาต | ❌ = ไม่อนุญาต | CRUD = Create/Read/Update/Delete | CRU = Create/Read/Update

### Soft Delete vs Hard Delete

| ประเภท | คำอธิบาย | ทำได้โดย | กู้คืนได้? |
|--------|----------|---------|-----------|
| **Soft Delete** | ย้ายไป Archive (ยังมีข้อมูล) | Admin, Manager | ✅ ได้ |
| **Hard Delete** | ลบถาวร (ไม่มีข้อมูล) | Admin only | ❌ ไม่ได้ |

---

## ⚡ Quick Actions by Role

### 🔴 Admin - Quick Actions

```
📊 Dashboard → ดูข้อมูลทั้งหมด
├─ 📅 Bookings → + New Booking → Fill form → Create
├─ 👥 Customers → + New Customer → Fill form → Save
├─ 👔 Staff → + Add Staff → Set Role → Create
├─ 🏢 Teams → + Create Team → Assign members → Save
├─ 📦 Packages → + New Package → Set pricing → Save
├─ 📊 Reports → Select range → View/Export
├─ ⚙️ Settings → Update business info/logo
└─ 🗑️ Archive → View/Restore/Permanently Delete
```

**สิทธิ์พิเศษ:**
- ✅ Hard Delete (ลบถาวร)
- ✅ Manage Settings
- ✅ View Financial Reports
- ✅ Create/Delete Staff

---

### 🟡 Manager - Quick Actions

```
📊 Dashboard → ดูข้อมูลทีม
├─ 📅 Bookings → + New Booking → Fill form → Create
├─ 📅 Bookings → [Select] → Edit/Archive
├─ 👥 Customers → + New Customer → Fill form → Save
├─ 👥 Customers → [Select] → Edit/Archive
├─ 🏢 Teams → + Create Team → Assign members → Save
├─ 📊 Reports → Select range → View/Export
├─ 💬 Chat → Send/Receive messages
└─ 🗑️ Archive → View/Restore items
```

**ข้อจำกัด:**
- ❌ Hard Delete (ลบถาวร)
- ❌ Settings (แก้ไขตั้งค่า)
- ❌ Create/Delete Staff
- ✅ Soft Delete + Restore

---

### 🟢 Staff - Quick Actions

```
📊 Dashboard → ดูงานของตนเอง
├─ 📍 Today → ดูงานวันนี้ (จำนวน + รายได้)
├─ ⏰ Upcoming → ดูงานที่กำลังมา
├─ ✅ Completed → ดูงานที่เสร็จแล้ว
├─ 📅 Calendar → ดูปฏิทินส่วนตัว
├─ 📅 Booking → [Select] → Update Status:
│   ├─ Start Work (In Progress)
│   ├─ Mark as Complete (Completed)
│   └─ Cancel (Cancelled)
├─ 💬 Chat → ติดต่อทีม
└─ 👤 Profile → อัพเดตข้อมูลส่วนตัว
```

**ข้อจำกัด:**
- ❌ Create/Edit Bookings (ดูและอัพเดตสถานะเท่านั้น)
- ❌ Delete anything
- ❌ View reports
- ✅ View assigned bookings only
- ✅ Update booking status

---

## 📝 Common Tasks

### 1. สร้างการจองใหม่ (Admin/Manager)

```
1. ไปที่ Bookings
2. คลิก + New Booking
3. เลือก/สร้าง Customer
4. เลือก Service Package
5. ตั้งวันที่ เวลา
6. เลือก Staff หรือ Team
7. เพิ่มหมายเหตุ (ถ้ามี)
8. คลิก Create
```

### 2. อัพเดตสถานะการจอง

**Admin/Manager:**
- เปิดการจอง → เลือกสถานะใหม่ → Update Status

**Staff:**
- Dashboard → My Bookings → [Select booking] → Update Status to:
  - `In Progress` (เริ่มงาน)
  - `Completed` (เสร็จสิ้น)
  - `Cancelled` (ยกเลิก)

### 3. Archive Items (Soft Delete)

```
1. ไปที่ Bookings/Customers/Teams
2. เลือกรายการที่ต้องการ archive
3. คลิก Archive button
4. ยืนยัน
5. รายการย้ายไป Archive section
```

**กู้คืน:** Archive Management → [Select item] → Restore

### 4. ส่งออกรายงาน (Admin/Manager)

```
1. ไปที่ Reports
2. เลือกช่วงวันที่
3. เลือกประเภท: Revenue/Bookings/Performance
4. ดู Charts และสถิติ
5. คลิก Export → CSV/PDF
```

---

## ⌨️ Shortcuts & Tips

### Keyboard Shortcuts

| Shortcut | ฟังก์ชัน |
|----------|----------|
| `Ctrl + K` | Command Palette (ค้นหาฟังก์ชัน) |
| `Esc` | ปิด Dialog/Modal |
| `Enter` | ยืนยันฟอร์ม |
| `/` | ค้นหา (ในบางหน้า) |

### เคล็ดลับการใช้งาน

✅ **ทำแบบนี้:**
- เปลี่ยนรหัสผ่านทุกเดือน
- Logout เมื่อไม่ใช้งาน
- ตรวจสอบ Archive ก่อน Hard Delete
- ใช้ Filter/Search เพื่อหาข้อมูลเร็ว

❌ **อย่าทำแบบนี้:**
- แชร์รหัสผ่าน
- ลบข้อมูลโดยไม่ยืนยัน
- เก็บข้อมูลลูกค้าในอุปกรณ์ส่วนตัว

### รูปแบบข้อมูล

- **สกุลเงิน:** Thai Baht (฿) - ใช้รูปแบบ ฿1,000.00
- **เวลา:** HH:MM (ไม่แสดงวินาที)
- **ที่อยู่:** [address], [city], [state] [zip_code]

---

## ❓ FAQ

### Q1: ไม่สามารถเข้า Dashboard ได้?
**A:**
- ตรวจสอบอินเทอร์เน็ต
- ลบ Cookies/Cache
- ลองเบราว์เซอร์อื่น
- ติดต่อ Admin

### Q2: ไม่เห็นปุ่ม Delete?
**A:** เพราะ:
- คุณไม่ใช่ Admin (ใช้ Archive แทน)
- ข้อมูลมีการอ้างอิงอื่น
- Role ของคุณไม่อนุญาต

### Q3: สถานะการจองไม่เปลี่ยน?
**A:**
- รีเฟรชหน้า (F5)
- ตรวจสอบสิทธิ์
- ตรวจสอบว่าการจองยังไม่ถูกลบ
- ติดต่อ Support

### Q4: ไฟล์ Chat ไม่ส่งได้?
**A:**
- ตรวจสอบขนาดไฟล์ (ต้อง < 10 MB)
- ตรวจสอบ connection
- ลองไฟล์อื่น

### Q5: Manager สามารถลบข้อมูลได้หรือไม่?
**A:** Manager สามารถ **Soft Delete** (Archive) ได้ แต่ **ไม่สามารถ Hard Delete** (ลบถาวร)

### Q6: ใครสามารถเปลี่ยน Role ได้?
**A:** **เฉพาะ Admin เท่านั้น**

### Q7: สามารถกู้คืนข้อมูลที่ลบ Hard Delete ได้หรือไม่?
**A:** ไม่ได้ **Hard Delete นั้นถาวร** (สามารถกู้คืนจากข้อมูลสำรองเท่านั้น)

---

## 📞 Support

### ช่องทางติดต่อ

| ช่องทาง | ข้อมูล |
|--------|--------|
| **Email** | support@tinedy.com |
| **Phone** | +66 (0) XX-XXXX-XXXX |
| **Chat** | ในแอป (Admin/Manager) |
| **Office Hours** | 09:00 - 18:00 (จันทร์-ศุกร์) |

### ลิงก์ที่มีประโยชน์

- [บทนำและภาพรวม](./01-introduction-and-overview.md)
- [Roles และ Permissions (ละเอียด)](./02-roles-and-permissions.md)
- [Admin Guide](./03-admin-guide.md)
- [Manager Guide](./04-manager-guide.md)
- [Staff Guide](./05-staff-guide.md)
- [Appendix](./10-appendix.md)

### บันทึกความปลอดภัย

🔐 **อย่าเคยบอก:**
- รหัสผ่าน
- API Keys
- ข้อมูลลูกค้าส่วนตัว

🔐 **ทำเสมอ:**
- Logout เมื่อจบงาน
- เปลี่ยนรหัสผ่านทุกเดือน
- ใช้ HTTPS (ปลอดภัย)

---

**อัพเดตล่าสุด:** 10 มกราคม 2568
**เวอร์ชัน:** 2.0 (Consolidated)
**ภาษา:** ไทย

💡 **เคล็ดลับ:** บันทึกหน้านี้ไว้เพื่อการอ้างอิงด่วน!
