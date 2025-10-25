# 🚀 Chat System Setup Guide

## ✅ ขั้นตอนที่ทำเสร็จแล้ว:

- ✅ สร้าง Components ทั้งหมด
- ✅ สร้าง Chat Pages (Admin & Staff)
- ✅ เพิ่ม Routes ใน App.tsx
- ✅ เพิ่ม Unread badge ใน Sidebar
- ✅ สร้าง Storage Bucket `chat-attachments`
- ✅ รัน Storage Policies SQL script

---

## ⚠️ ขั้นตอนที่ต้องทำเพิ่มเติม:

### 1. ตั้งค่า CORS สำหรับ Storage Bucket

**ปัญหา:** Browser บล็อกการดาวน์โหลดไฟล์จาก Supabase Storage

**วิธีแก้:**

1. ไปที่ **Supabase Dashboard**
2. **Storage** > **chat-attachments**
3. คลิก **⋮** (three dots) > **Configuration** หรือ **Settings**
4. หา **CORS Configuration**
5. เพิ่ม CORS rules:

#### สำหรับ Development (localhost):
```json
[
  {
    "allowedOrigins": ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
    "allowedHeaders": ["*"],
    "exposedHeaders": [],
    "maxAgeSeconds": 3600
  }
]
```

#### สำหรับ Production:
```json
[
  {
    "allowedOrigins": ["https://yourdomain.com", "https://www.yourdomain.com"],
    "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
    "allowedHeaders": ["*"],
    "exposedHeaders": [],
    "maxAgeSeconds": 3600
  }
]
```

#### ทดสอบทุก domain (ไม่แนะนำสำหรับ production):
```json
[
  {
    "allowedOrigins": ["*"],
    "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
    "allowedHeaders": ["*"],
    "exposedHeaders": [],
    "maxAgeSeconds": 3600
  }
]
```

---

### 2. ตรวจสอบ Bucket เป็น Public

1. ไปที่ **Storage** > **chat-attachments**
2. ตรวจสอบว่า **Public bucket** = ✅ (เปิดอยู่)
3. ถ้ายังไม่เปิด: คลิก **Settings** > เปิด **Public bucket**

---

### 3. ตรวจสอบ Storage Policies

รัน query นี้ใน SQL Editor เพื่อดู policies ที่มี:

```sql
SELECT * FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';
```

ควรเห็น 4 policies:
- ✅ `Users can upload to own folder`
- ✅ `Users can read all chat files`
- ✅ `Users can update own files`
- ✅ `Users can delete own files`

---

## 🧪 การทดสอบ

### 1. ทดสอบส่งข้อความ

1. Login เป็น **Admin**
2. ไปที่ `/admin/chat`
3. เลือก Staff คนหนึ่ง
4. พิมพ์ข้อความแล้วกด Enter
5. ✅ ควรเห็นข้อความปรากฏทันที

### 2. ทดสอบแนบไฟล์

1. คลิกปุ่ม **📎 Attach**
2. เลือกรูปภาพ (JPEG, PNG, GIF) หรือ PDF
3. คลิก **Send**
4. ✅ ควรเห็นไฟล์แสดงใน chat bubble

### 3. ทดสอบ Real-time

1. เปิด 2 browser windows
2. Window 1: Login เป็น **Admin**
3. Window 2: Login เป็น **Staff**
4. ส่งข้อความจาก Admin
5. ✅ Staff ควรเห็นข้อความทันทีโดยไม่ต้อง refresh

### 4. ทดสอบ Unread Badge

1. ส่งข้อความจาก Staff → Admin
2. ดูที่ Sidebar ของ Admin
3. ✅ ควรเห็น badge สีแดงที่เมนู "Chat"
4. เปิดหน้า Chat
5. ✅ Badge ควรหายไปเมื่ออ่านข้อความแล้ว

---

## 🐛 Troubleshooting

### ปัญหา: ไฟล์ไม่แสดงผล (CORS Error)

**อาการ:** เห็น error ใน Console:
```
A resource is blocked by OpaqueResponseBlocking
```

**วิธีแก้:**
1. ตั้งค่า CORS ตามขั้นตอนด้านบน
2. Hard refresh browser (Ctrl+Shift+R หรือ Cmd+Shift+R)
3. ลองส่งไฟล์ใหม่

### ปัญหา: ไม่สามารถอัพโหลดไฟล์ได้

**อาการ:** เห็น error "Failed to upload file"

**วิธีแก้:**
1. เช็คว่า Bucket เป็น Public
2. เช็ค Storage Policies (รัน SQL script อีกครั้ง)
3. เช็คว่าไฟล์ไม่เกิน 10MB
4. เช็คว่าเป็นไฟล์ประเภทที่รองรับ (JPEG, PNG, GIF, WebP, PDF)

### ปัญหา: ข้อความไม่ส่ง real-time

**อาการ:** ต้อง refresh หน้าถึงจะเห็นข้อความใหม่

**วิธีแก้:**
1. เช็ค Console ว่ามี error หรือไม่
2. เช็คว่า Supabase Realtime เปิดอยู่
3. เช็ค Network tab ว่า WebSocket connection สำเร็จหรือไม่

---

## 📁 ไฟล์ที่เกี่ยวข้อง

- `src/components/chat/` - Chat components ทั้งหมด
- `src/pages/admin/chat.tsx` - Admin chat page
- `src/pages/staff/chat.tsx` - Staff chat page
- `src/hooks/use-chat.ts` - Chat logic & real-time
- `src/lib/chat-storage.ts` - File upload/download
- `supabase-chat-storage-policies.sql` - SQL setup script

---

## ✅ Checklist การตั้งค่า

- [ ] รัน SQL script ใน Supabase SQL Editor
- [ ] ตั้งค่า CORS สำหรับ `chat-attachments` bucket
- [ ] ตรวจสอบว่า bucket เป็น Public
- [ ] ทดสอบส่งข้อความ
- [ ] ทดสอบแนบไฟล์
- [ ] ทดสอบ real-time messaging
- [ ] ทดสอบ unread badge

---

**เมื่อทำครบทุกข้อแล้ว Chat System พร้อมใช้งาน! 🎉**
