# 👔 Manager Role - User Guide

## 📋 ภาพรวม

คู่มือนี้สำหรับผู้ใช้งานที่มี **Manager role** ใน Tinedy CRM จะอธิบายความสามารถ สิทธิ์การเข้าถึง และวิธีการใช้งานระบบอย่างมีประสิทธิภาพ

**Manager role** เป็นระดับการจัดการที่อยู่ระหว่าง Staff และ Admin ทำให้คุณสามารถจัดการงานประจำวัน ดูแลทีม และสร้าง reports ได้โดยไม่ต้องมีสิทธิ์เต็มรูปแบบของ Admin

---

## 🎯 ความสามารถของ Manager

### สิ่งที่ Manager ทำได้ ✅

#### 📅 Bookings Management
- **Create** bookings สำหรับลูกค้า
- **View** bookings ทั้งหมดในระบบ
- **Update** รายละเอียด bookings
- **Archive** (soft delete) bookings ที่ยกเลิก
- **Restore** bookings ที่ถูก archive
- **Export** booking data เป็น CSV/Excel
- **Manage** status และ payment status

#### 👥 Customer Management
- **Create** customer profiles ใหม่
- **View** ข้อมูลลูกค้าทั้งหมด
- **Update** ข้อมูลลูกค้า
- **Archive** customer records ที่ไม่ใช้งาน
- **Export** customer data

#### 👨‍💼 Staff & Team Management
- **View** staff และ team information
- **Assign** staff/teams ให้กับ bookings
- **Update** staff assignments
- **Create** teams ใหม่
- **Update** team information
- **View** staff performance และ schedules

#### 📊 Reports & Analytics
- **View** revenue reports
- **View** performance metrics
- **View** booking statistics
- **Export** reports และ analytics data
- **View** charts และ visualizations

#### 📦 Service Packages
- **View** service packages ทั้งหมด
- **View** package details และ pricing
- **Use** packages ในการสร้าง bookings

### สิ่งที่ Manager ทำไม่ได้ ❌

#### 🚫 Restricted Operations
- **Hard Delete** - ไม่สามารถลบข้อมูลถาวร (เฉพาะ Admin)
- **Create/Delete Staff** - ไม่สามารถสร้างหรือลบ staff users
- **Manage Service Packages** - ไม่สามารถสร้าง/แก้ไข/ลบ packages
- **Access Settings** - ไม่สามารถเข้าถึง system settings
- **Manage User Roles** - ไม่สามารถเปลี่ยน roles ของ users
- **Permanently Delete** - ไม่สามารถลบ archived records ถาวร

---

## 📊 Permission Matrix

ตารางสิทธิ์การเข้าถึงแบบละเอียด:

| Resource | Create | Read | Update | Delete (Hard) | Archive (Soft) | Export |
|----------|:------:|:----:|:------:|:-------------:|:--------------:|:------:|
| **Bookings** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Customers** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Staff** | ❌ | ✅ | ✅* | ❌ | ❌ | ❌ |
| **Teams** | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Service Packages** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Reports** | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Settings** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Users** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

*\*Update staff = assignment only, not profile changes*

### สัญลักษณ์
- ✅ = ทำได้
- ❌ = ทำไม่ได้
- 🟡 = ทำได้บางกรณี/มีเงื่อนไข

---

## 🚀 เริ่มต้นใช้งาน

### การ Login

1. เปิด Tinedy CRM application
2. กรอก email และ password ของคุณ
3. กด "Login"
4. ระบบจะ redirect คุณไปที่ **Manager Dashboard** อัตโนมัติ

### หน้า Dashboard

หลังจาก login คุณจะเห็น:

- **Overview Cards**: สรุปข้อมูลสำคัญ (bookings วันนี้, revenue, pending tasks)
- **Recent Bookings**: รายการ bookings ล่าสุด
- **Quick Actions**: ปุ่มสำหรับ actions ที่ใช้บ่อย
- **Performance Charts**: กราฟแสดงประสิทธิภาพ

---

## 📖 Common Workflows

### 1. สร้าง Booking ใหม่

**ขั้นตอน:**
1. ไปที่ **Bookings** page จาก sidebar
2. กดปุ่ม **"New Booking"**
3. กรอกข้อมูล:
   - เลือก **Customer** (หรือสร้างใหม่)
   - เลือก **Service Package**
   - เลือก **Date และ Time**
   - เลือก **Staff** หรือ **Team**
   - กรอก **Location** และ **Notes**
4. ตรวจสอบ **Availability** (ระบบจะแจ้งถ้ามี conflicts)
5. กด **"Create Booking"**

**Tips:**
- ใช้ฟีเจอร์ **Check Availability** ก่อนสร้าง booking
- เลือก **Recurring Booking** ถ้าต้องการทำซ้ำหลายวัน
- ระบุ **Payment Status** ทันทีถ้าได้รับชำระแล้ว

### 2. จัดการ Booking Status

**การเปลี่ยน Status:**
1. ไปที่ **Bookings** page
2. หา booking ที่ต้องการ
3. กด **dropdown menu** ที่ status badge
4. เลือก status ใหม่:
   - `Pending` → `Confirmed`
   - `Confirmed` → `In Progress`
   - `In Progress` → `Completed`
   - หรือ `Cancelled`/`No Show`

**Status Flow ปกติ:**
```
Pending → Confirmed → In Progress → Completed
                 ↓
            Cancelled / No Show
```

### 3. Archive Booking (Soft Delete)

เมื่อต้องการ "ลบ" booking:

1. ไปที่ booking ที่ต้องการ archive
2. กดปุ่ม **"Archive"** (ไม่ใช่ Delete)
3. ยืนยันการ archive
4. Booking จะถูกซ่อนจากรายการหลัก แต่ยังเก็บไว้ในระบบ

**Restore Archived Booking:**
1. เปิด **Archived Bookings** view (toggle "Show Archived")
2. หา booking ที่ต้องการ restore
3. กดปุ่ม **"Restore"**
4. Booking จะกลับมาแสดงในรายการปกติ

⚠️ **สำคัญ**: Manager ไม่สามารถลบ booking ถาวรได้ เฉพาะ Admin เท่านั้น

### 4. สร้าง Customer Profile

**ขั้นตอน:**
1. ไปที่ **Customers** page
2. กดปุ่ม **"New Customer"**
3. กรอกข้อมูล:
   - **Required**: ชื่อ, email, เบอร์โทร
   - **Optional**: ที่อยู่, LINE ID, วันเกิด, tags
4. เลือก **Relationship Level** (New/Regular/VIP)
5. เลือก **Preferred Contact Method**
6. กด **"Create Customer"**

### 5. Assign Staff/Team ให้ Booking

**Assign Individual Staff:**
1. เปิด booking details
2. กด **"Edit"**
3. ในส่วน **Assignment** เลือก:
   - **Assignment Type**: "Individual Staff"
   - **Select Staff**: เลือก staff member
4. ระบบจะตรวจสอบ availability อัตโนมัติ
5. กด **"Save"**

**Assign Team:**
1. เปิด booking details
2. กด **"Edit"**
3. ในส่วน **Assignment** เลือก:
   - **Assignment Type**: "Team"
   - **Select Team**: เลือก team
4. กด **"Save"**

### 6. View Reports

**Revenue Report:**
1. ไปที่ **Reports** page
2. เลือก **date range** ที่ต้องการดู
3. ดู metrics:
   - Total Revenue
   - Revenue by Service Type
   - Revenue by Staff/Team
4. กด **"Export"** เพื่อ download เป็น Excel/CSV

**Performance Report:**
1. ไปที่ **Reports** > **Performance**
2. เลือก Staff หรือ Team
3. ดู:
   - Completed Bookings
   - Revenue Generated
   - Customer Satisfaction (ถ้ามี)
4. Export data ถ้าต้องการ

### 7. Create Team

**ขั้นตอน:**
1. ไปที่ **Teams** page
2. กดปุ่ม **"New Team"**
3. กรอก:
   - **Team Name**
   - **Description**
4. กด **"Create Team"**
5. หลังสร้างแล้ว สามารถ assign staff เข้า team ได้

---

## 💡 Tips & Best Practices

### Booking Management
- ✅ เช็ค staff availability ก่อนสร้าง booking เสมอ
- ✅ Update booking status ให้ทันสมัยอยู่เสมอ
- ✅ ใช้ Notes field เพื่อบันทึกรายละเอียดพิเศษ
- ✅ Set payment status ทันทีเมื่อได้รับชำระเงิน
- ⚠️ ใช้ Archive แทน Delete เสมอ (สามารถ restore ได้)

### Customer Management
- ✅ บันทึก customer preferences และ notes
- ✅ อัพเดท relationship level ตามพฤติกรรมลูกค้า
- ✅ ใช้ Tags เพื่อจัดกลุ่มลูกค้า (VIP, Regular, New)
- ✅ เก็บ contact information ให้ครบและถูกต้อง

### Team Management
- ✅ สร้าง teams ตามประเภทงานหรือทักษะ
- ✅ Balance workload ระหว่าง teams
- ✅ Monitor team performance regularly
- ✅ Assign ตาม availability และ skill set

### Reporting
- ✅ Export reports เป็นประจำสำหรับ records
- ✅ ใช้ date filters เพื่อดูข้อมูลตามช่วงเวลา
- ✅ เปรียบเทียบ performance ระหว่าง staff/teams
- ✅ Track trends เพื่อวางแผนล่วงหน้า

---

## 🔍 หน้าจอและฟีเจอร์ต่างๆ

### Sidebar Navigation

Manager จะเห็น menu items ดังนี้:

```
📊 Dashboard           - ภาพรวมและ metrics
📅 Bookings           - จัดการ bookings
🗓️  Calendar           - ดู bookings แบบปฏิทิน
📅 Weekly Schedule    - ดูตารางรายสัปดาห์
👥 Customers          - จัดการ customers
👨‍💼 Staff              - ดูข้อมูล staff
👥 Teams              - จัดการ teams
💬 Chat               - ระบบแชท
📊 Reports            - รายงานและ analytics
👤 My Profile         - โปรไฟล์ของคุณ
```

**ไม่เห็น:**
- ⚙️ Settings (Admin only)
- 📦 Service Packages Management (Admin only)

### Dashboard Widgets

1. **Today's Bookings Card**
   - จำนวน bookings วันนี้
   - แยกตาม status
   - Quick link ไปดูรายละเอียด

2. **Revenue Card**
   - Revenue วันนี้
   - Revenue เดือนนี้
   - เปรียบเทียบกับเดือนก่อน

3. **Pending Tasks Card**
   - Bookings ที่รอยืนยัน
   - Payment ที่รอตรวจสอบ
   - Quick actions

4. **Recent Bookings Table**
   - 10 bookings ล่าสุด
   - Quick status update
   - Link ไปดู details

### Bookings Page

**Features:**
- **Search**: ค้นหาด้วย customer name, booking ID
- **Filters**: กรองตาม status, date range, service type
- **Sort**: เรียงตามวันที่, status, customer
- **Bulk Actions**: เลือกหลาย bookings พร้อมกัน
- **Export**: Download เป็น CSV/Excel
- **Pagination**: แสดง 10/25/50/100 รายการต่อหน้า

**Booking Card Actions:**
- ✏️ **Edit**: แก้ไขรายละเอียด
- 📋 **View Details**: ดูข้อมูลเต็ม
- 🗑️ **Archive**: Archive booking (ไม่ใช่ delete)
- 🔄 **Update Status**: เปลี่ยน status

### Calendar View

**Month View:**
- ดู bookings ทั้งหมดในเดือน
- Color-coded ตาม status
- Click เพื่อดูรายละเอียด

**Week View:**
- ดู schedule รายสัปดาห์
- แสดง time slots
- Drag-and-drop (ถ้า implement)

**Day View:**
- รายละเอียดแต่ละวัน
- Timeline view
- เห็น conflicts ชัดเจน

### Reports Page

**Available Reports:**

1. **Revenue Report**
   - Total revenue
   - Revenue by period
   - Revenue by service type
   - Revenue by staff/team

2. **Booking Statistics**
   - Total bookings
   - Completion rate
   - Cancellation rate
   - No-show rate

3. **Customer Analytics**
   - New customers
   - Returning customers
   - Customer lifetime value
   - Customer segmentation

4. **Staff/Team Performance**
   - Bookings per staff/team
   - Revenue per staff/team
   - Completion rate
   - Customer ratings (ถ้ามี)

**Export Options:**
- 📊 Excel (.xlsx)
- 📄 CSV (.csv)
- 📑 PDF (ถ้า implement)

---

## ❓ FAQ (คำถามที่พบบ่อย)

### Q: ทำไมฉันถึงไม่เห็นปุ่ม "Delete"?
**A**: Manager ไม่สามารถ hard delete ได้ เพื่อป้องกันการลบข้อมูลถาวรโดยไม่ตั้งใจ ใช้ "Archive" แทน ซึ่งสามารถ restore ได้ภายหลัง

### Q: จะ restore booking ที่ archive ไว้ได้อย่างไร?
**A**: ใน Bookings page เปิด toggle "Show Archived" แล้วกด "Restore" ที่ booking ที่ต้องการ

### Q: ทำไมฉันถึงสร้าง staff ใหม่ไม่ได้?
**A**: การสร้าง staff users ต้องทำโดย Admin เท่านั้น เพื่อควบคุมการเข้าถึงระบบ ถ้าต้องการเพิ่ม staff ให้ติดต่อ Admin

### Q: จะเปลี่ยน service package ราคาได้ไหม?
**A**: Manager ไม่สามารถแก้ไข service packages ได้ ถ้าต้องการเปลี่ยนราคาหรือรายละเอียด ให้ติดต่อ Admin

### Q: ถ้า booking มี conflict (เวลาซ้อน) จะทำยังไง?
**A**: ระบบจะแจ้งเตือนอัตโนมัติเมื่อมี conflicts ให้เลือก:
1. เลือก staff/team คนอื่น
2. เลือกเวลาอื่น
3. Override conflict (ถ้าจำเป็น)

### Q: จะ track payment ได้อย่างไร?
**A**: ในแต่ละ booking มี payment fields:
- Payment Status (Unpaid/Paid/Partial/Refunded)
- Payment Method (Cash/Transfer/Credit Card/etc.)
- Amount Paid
- Payment Date
- Payment Notes

### Q: สามารถเปลี่ยน role ของตัวเองเป็น Admin ได้ไหม?
**A**: ไม่ได้ เฉพาะ Admin เท่านั้นที่สามารถเปลี่ยน roles ของ users ได้ เพื่อรักษาความปลอดภัยของระบบ

### Q: Archived bookings จะถูกลบถาวรหรือไม่?
**A**: ไม่ Archived bookings ยังอยู่ในระบบและสามารถ restore ได้ตลอดเวลา เฉพาะ Admin เท่านั้นที่สามารถลบถาวรได้

---

## 🎓 Training & Support

### Resources
- 📖 [Migration Guide](MANAGER_ROLE_MIGRATION_GUIDE.md) - สำหรับ technical team
- 👨‍💼 [Admin Guide](ADMIN_GUIDE_USER_MANAGEMENT.md) - สำหรับ Admin
- 📋 [Implementation Plan](MANAGER_ROLE_IMPLEMENTATION_PLAN.md) - แผนการพัฒนา

### Getting Help
1. ดูคู่มือนี้สำหรับคำถามทั่วไป
2. ติดต่อ Admin ถ้าต้องการเปลี่ยนแปลง permissions
3. รายงาน bugs หรือขอ features ใหม่ให้ development team

---

## 🔄 What's New

### Version 1.0 (2025-01-18)
- ✨ เพิ่ม Manager role ใหม่
- 🔒 Permission-based access control
- 🗑️ Soft delete system
- 📊 Enhanced reporting for managers
- 🧪 157 automated tests สำหรับ permissions

---

## 📈 Future Enhancements

Features ที่อาจมีเพิ่มในอนาคต:

- 🔔 Notifications & Alerts
- 📱 Mobile app support
- 🤖 Automated workflow triggers
- 📊 Advanced analytics & AI insights
- 💬 Internal messaging system enhancement

---

**💼 ขอให้ใช้งานระบบอย่างมีประสิทธิภาพ!**

ถ้ามีคำถามหรือข้อเสนอแนะ โปรดติดต่อ Admin หรือ development team

---

**Last Updated**: 2025-01-18
**Version**: 1.0
**For**: Manager Role Users
