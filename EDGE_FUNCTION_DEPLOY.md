# วิธี Deploy Edge Function สำหรับการสร้าง Staff

## 🎯 วิธีที่ 1: Deploy ผ่าน Supabase Dashboard (แนะนำ - ง่ายที่สุด!)

### ขั้นตอน:

#### 1. เปิด Supabase Dashboard
ไปที่ https://supabase.com/dashboard → เลือก Project ของคุณ

#### 2. ไปที่ Edge Functions
- คลิกที่ **Edge Functions** ในเมนูด้านซ้าย
- คลิกปุ่ม **"Create a new function"** หรือ **"Deploy new function"**

#### 3. สร้าง Function ใหม่
- **Function name:** `create-staff`
- คลิก **Create function**

#### 4. Copy โค้ดจากไฟล์
เปิดไฟล์ `supabase/functions/create-staff/index.ts` แล้ว **copy โค้ดทั้งหมด**

#### 5. Paste โค้ดใน Dashboard
- ใน Dashboard จะมี Code Editor ขึ้นมา
- **ลบโค้ดเดิมทั้งหมด** ที่มีอยู่
- **Paste โค้ด** จากไฟล์ `index.ts` ที่ copy มา
- คลิกปุ่ม **"Deploy"** หรือ **"Save"**

#### 6. ตรวจสอบว่า Deploy สำเร็จ
- Status ต้องเป็น **"Active"** หรือ **"Deployed"**
- จะเห็น function `create-staff` ในรายการ

---

## 🔧 วิธีที่ 2: Deploy ผ่าน Supabase CLI (สำหรับคนที่ติดตั้ง CLI ได้)

### 1. ติดตั้ง Supabase CLI

```bash
npm install -g supabase
```

### 2. Login เข้า Supabase

```bash
supabase login
```

### 3. Link โปรเจคกับ Supabase Project

```bash
cd "c:\Users\Jiraw\OneDrive\Desktop\CRM tinedy\tinedy-crm"
supabase link --project-ref <YOUR_PROJECT_REF>
```

### 4. Deploy Edge Function

```bash
supabase functions deploy create-staff
```

### 5. ตรวจสอบว่า Deploy สำเร็จ

ไปที่ Supabase Dashboard → Edge Functions → จะเห็น `create-staff` function

---

## วิธีทดสอบ

หลังจาก deploy แล้ว ลองสร้าง staff ใหม่จากหน้า Admin → Staff → Add Staff Member

**ผลลัพธ์ที่คาดหวัง:**
- ✅ ไม่มี warning "Multiple GoTrueClient instances"
- ✅ Admin ไม่ logout
- ✅ Staff ถูกสร้างสำเร็จ
- ✅ Staff สามารถ login ได้

---

## การแก้ปัญหา

### ถ้า Deploy ไม่สำเร็จ

1. ตรวจสอบว่า login แล้ว: `supabase projects list`
2. ตรวจสอบว่า link project แล้ว: `supabase status`

### ถ้า Function Error

ดู logs:
```bash
supabase functions logs create-staff
```

หรือดูใน Supabase Dashboard → Edge Functions → create-staff → Logs

---

## ข้อมูลเพิ่มเติม

Edge Function ที่สร้างไว้:
- **ตำแหน่ง:** `supabase/functions/create-staff/index.ts`
- **ความปลอดภัย:** ใช้ Admin API (SUPABASE_SERVICE_ROLE_KEY) เพื่อสร้าง user
- **ตรวจสอบสิทธิ์:** ตรวจสอบว่าต้องเป็น admin เท่านั้นที่สามารถเรียกใช้ได้
- **Auto-confirm:** Email จะถูก auto-confirm ไม่ต้องกด link ใน email

---

## ข้อดีของ Edge Function

1. ✅ **Production-grade** - ใช้ Supabase Admin API อย่างปลอดภัย
2. ✅ **ไม่มี Multiple Client Warning** - ไม่สร้าง client ใหม่ที่ฝั่ง browser
3. ✅ **Admin ไม่ logout** - การสร้าง user เกิดที่ server-side
4. ✅ **ปลอดภัยกว่า** - SERVICE_ROLE_KEY ไม่ถูก expose ที่ฝั่ง client
5. ✅ **รองรับการขยายงาน** - สามารถเพิ่ม logic อื่นๆ ได้ เช่น ส่ง email welcome

