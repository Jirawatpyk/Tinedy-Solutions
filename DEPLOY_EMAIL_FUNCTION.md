# วิธี Deploy Edge Function สำหรับส่ง Email

## 📧 Edge Functions ที่สร้างแล้ว

✅ `send-booking-confirmation` - ส่ง email ยืนยันการจองให้ลูกค้าทันที
✅ `process-email-queue` - ประมวลผล email queue อัตโนมัติ (5 ประเภท)

---

## 🚀 วิธี Deploy (เลือก 1 ใน 2 วิธี)

### วิธีที่ 1: Deploy ผ่าน Supabase Dashboard (แนะนำ - ง่ายที่สุด!)

#### ขั้นตอน:

**1. เปิด Supabase Dashboard**
- ไปที่ https://supabase.com/dashboard
- เลือก Project ของคุณ

**2. ไปที่ Edge Functions**
- คลิกที่ **Edge Functions** ในเมนูด้านซ้าย
- คลิกปุ่ม **"Create a new function"**

**3. สร้าง Function ใหม่**
- **Function name:** `send-booking-confirmation`
- คลิก **Create function**

**4. Copy โค้ดจากไฟล์**
- เปิดไฟล์: `supabase/functions/send-booking-confirmation/index.ts`
- **Copy โค้ดทั้งหมด**

**5. Paste โค้ดใน Dashboard**
- ใน Dashboard จะมี Code Editor ขึ้นมา
- **ลบโค้ดเดิมทั้งหมด** ที่มีอยู่
- **Paste โค้ด** จากไฟล์ `index.ts` ที่ copy มา
- คลิกปุ่ม **"Deploy"** หรือ **"Save"**

**6. ตั้งค่า Environment Variables**
- ไปที่ **Settings** → **Edge Functions** → **Environment Variables**
- เพิ่ม secrets ต่อไปนี้:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=Tinedy CRM <bookings@yourdomain.com>
EMAIL_REPLY_TO=support@yourdomain.com (optional)
```

**7. ตรวจสอบว่า Deploy สำเร็จ**
- Status ต้องเป็น **"Active"** หรือ **"Deployed"**
- จะเห็น function `send-booking-confirmation` ในรายการ

---

### วิธีที่ 2: Deploy ผ่าน Supabase CLI

#### 1. ติดตั้ง Supabase CLI

```bash
npm install -g supabase
```

#### 2. Login เข้า Supabase

```bash
supabase login
```

#### 3. Link โปรเจคกับ Supabase Project

```bash
cd "c:\Users\Jiraw\OneDrive\Desktop\CRM tinedy\tinedy-crm"
supabase link --project-ref <YOUR_PROJECT_REF>
```

> **หา PROJECT_REF ได้ที่ไหน?**
> - ไปที่ Supabase Dashboard → Project Settings → General
> - หรือดูจาก URL: `https://supabase.com/dashboard/project/<PROJECT_REF>`

#### 4. ตั้งค่า Environment Variables

```bash
# ตั้งค่า RESEND_API_KEY
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ตั้งค่า EMAIL_FROM
supabase secrets set EMAIL_FROM="Tinedy CRM <bookings@yourdomain.com>"

# ตั้งค่า EMAIL_REPLY_TO (optional)
supabase secrets set EMAIL_REPLY_TO="support@yourdomain.com"
```

#### 5. Deploy Edge Function

```bash
supabase functions deploy send-booking-confirmation
```

#### 6. ตรวจสอบว่า Deploy สำเร็จ

```bash
supabase functions list
```

ควรเห็น:
```
send-booking-confirmation (Active)
```

---

## 🧪 วิธีทดสอบ

### 1. ทดสอบผ่าน Dashboard

ไปที่ Supabase Dashboard → Edge Functions → `send-booking-confirmation` → **Test**

ใส่ JSON:
```json
{
  "bookingId": "test-123",
  "customerName": "Test User",
  "customerEmail": "your-email@example.com",
  "serviceName": "Test Service",
  "bookingDate": "2025-11-01",
  "startTime": "10:00",
  "endTime": "12:00",
  "totalPrice": 1000,
  "paymentLink": "https://example.com/payment/test-123"
}
```

คลิก **Execute** → ตรวจสอบ email ที่ `your-email@example.com`

### 2. ทดสอบผ่านแอพ

1. เปิดแอพ Tinedy CRM
2. สร้าง booking ใหม่
3. ตรวจสอบ email inbox
4. ตรวจสอบ console ว่ามี error หรือไม่

### 3. ดู Logs

ผ่าน Dashboard:
- Edge Functions → `send-booking-confirmation` → **Logs**

ผ่าน CLI:
```bash
supabase functions logs send-booking-confirmation
```

---

## ⚠️ สิ่งที่ต้องเช็คก่อน Deploy

### 1. Resend API Key

- ✅ สมัครที่ https://resend.com
- ✅ สร้าง API key ที่ https://resend.com/api-keys
- ✅ Copy key ที่ขึ้นต้นด้วย `re_`

### 2. Email From Address

**Development (ฟรี):**
```
EMAIL_FROM=Tinedy CRM <bookings@resend.dev>
```

**Production (ต้อง verify domain):**
```
EMAIL_FROM=Tinedy CRM <bookings@tinedy.com>
```

> **หมายเหตุ:** Resend free tier ส่งได้เฉพาะ verified emails เท่านั้น

### 3. Verified Emails (สำหรับทดสอบ)

ถ้ายังไม่ verify domain:
1. ไปที่ https://resend.com/emails
2. Verify email ที่ต้องการทดสอบ
3. ใช้ email นั้นสำหรับทดสอบเท่านั้น

---

## 🐛 การแก้ปัญหา

### Edge Function ไม่ทำงาน

**1. เช็ค Logs:**
```bash
supabase functions logs send-booking-confirmation --limit 50
```

**2. เช็ค Secrets:**
```bash
supabase secrets list
```

ต้องมี:
- `RESEND_API_KEY`
- `EMAIL_FROM`

**3. เช็ค Status:**
```bash
supabase functions list
```

Status ต้องเป็น `Active`

### Email ไม่ส่ง

**1. RESEND_API_KEY ผิด:**
- ตรวจสอบ API key ที่ https://resend.com/api-keys
- Set ใหม่: `supabase secrets set RESEND_API_KEY=re_xxx`

**2. Email ไม่ verified:**
- Free tier ส่งได้เฉพาะ verified emails
- Verify ที่ https://resend.com/emails

**3. Domain ไม่ verified:**
- ถ้าใช้ custom domain ต้อง verify DNS records
- ดูที่ https://resend.com/domains

### CORS Error

ถ้ายังมี CORS error แสดงว่า:
- Edge Function ยังไม่ได้ deploy
- หรือ client ยังเรียก Resend โดยตรง

แก้โดย:
1. Deploy Edge Function
2. ตรวจสอบว่า `src/lib/email.ts` เรียกใช้ `supabase.functions.invoke()` แล้ว

---

## 📊 Email Flow หลัง Deploy

```
┌─────────────────────────────────────────┐
│  User สร้าง Booking                      │
│  (BookingCreateModal)                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Client เรียก sendBookingConfirmation()│
│  (src/lib/email.ts)                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  supabase.functions.invoke()            │
│  → Edge Function                        │
│  → send-booking-confirmation            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Edge Function เรียก Resend API        │
│  ส่ง email ให้ลูกค้า                    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  ลูกค้าได้รับ email ยืนยันการจอง       │
│  พร้อม payment link                     │
└─────────────────────────────────────────┘
```

---

## ✅ Checklist

- [ ] ติดตั้ง Supabase CLI (ถ้าใช้วิธีที่ 2)
- [ ] Login Supabase: `supabase login`
- [ ] Link project: `supabase link --project-ref xxx`
- [ ] สมัคร Resend account
- [ ] ได้ Resend API key
- [ ] Set `RESEND_API_KEY` secret
- [ ] Set `EMAIL_FROM` secret
- [ ] Deploy function: `supabase functions deploy send-booking-confirmation`
- [ ] ทดสอบส่ง email
- [ ] เช็ค logs ไม่มี error

---

## 🔄 Process Email Queue System

### ระบบ Email Queue คืออะไร?

Email Queue เป็นระบบที่บันทึก email ที่ต้องส่งลง database ก่อน แล้วค่อยมี background process มาส่งทีหลัง

**ประโยชน์:**
- ส่ง email แบบ scheduled (เช่น reminder ก่อนนัด 1 วัน)
- Retry อัตโนมัติถ้าส่งไม่สำเร็จ
- ติดตามสถานะการส่ง email ทั้งหมด

### Email ที่ใช้ Queue System (5 ประเภท)

1. **Payment Link** - ส่งลิงก์ชำระเงินให้ลูกค้า
2. **Payment Confirmation** - ยืนยันการชำระเงินสำเร็จ
3. **Payment Reminder** - เตือนชำระเงินที่ค้างอยู่
4. **Booking Reminder** - เตือนก่อนนัดหมาย 1 วัน (scheduled)
5. **Booking Rescheduled** - แจ้งการเปลี่ยนนัดหมาย

### วิธี Deploy Process Queue Function

#### 1. Deploy Edge Function

**Dashboard:**
```bash
# สร้าง function ชื่อ: process-email-queue
# Copy โค้ดจาก: supabase/functions/process-email-queue/index.ts
```

**CLI:**
```bash
supabase functions deploy process-email-queue
```

#### 2. ตั้งค่า Environment Variables

ต้องมี secrets เหมือนกับ `send-booking-confirmation`:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set EMAIL_FROM="Tinedy CRM <bookings@yourdomain.com>"
supabase secrets set APP_URL="https://your-app-url.com"
```

**Environment Variables ทั้งหมด:**
- `RESEND_API_KEY` - API key จาก Resend
- `EMAIL_FROM` - ที่อยู่ email ผู้ส่ง
- `EMAIL_REPLY_TO` - (optional) email สำหรับตอบกลับ
- `APP_URL` - URL ของแอพ (สำหรับสร้าง payment link)
- `SUPABASE_URL` - URL ของ Supabase project (auto-set)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (auto-set)

#### 3. ตั้งค่า Cron Job (2 วิธี)

**วิธีที่ 1: ใช้ pg_cron Extension (แนะนำ)**

Run migration:
```bash
# Apply migration ที่สร้างไว้แล้ว
supabase db push

# หรือ run SQL โดยตรงใน Dashboard
# ไปที่ SQL Editor → New Query → Paste จาก supabase/migrations/setup_email_cron.sql
```

Migration จะ:
- Enable `pg_cron` extension
- สร้าง function `process_email_queue_cron()`
- Schedule ให้รันทุก 5 นาที

**วิธีที่ 2: ใช้ External Cron Service**

ใช้ service อย่าง:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- GitHub Actions

ตั้งให้เรียก URL:
```bash
POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-email-queue
Header: Authorization: Bearer YOUR_ANON_KEY
```

#### 4. ทดสอบ Process Queue

**ทดสอบผ่าน Dashboard:**
```json
{}
```
Execute function `process-email-queue` → ดูผลลัพธ์

**ทดสอบผ่าน CLI:**
```bash
supabase functions invoke process-email-queue
```

**ดู Logs:**
```bash
supabase functions logs process-email-queue --limit 50
```

### Email Flow แบบ Queue System

```
┌─────────────────────────────────────────┐
│  User Action (เช่น จอง, จ่ายเงิน)        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Client เรียก sendXxxEmail()             │
│  (src/lib/email.ts)                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  queueEmail() - บันทึกลง database       │
│  status: 'pending'                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Cron Job รันทุก 5 นาที                 │
│  เรียก process-email-queue              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Edge Function อ่าน pending emails     │
│  (max 10 emails/ครั้ง)                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  สร้าง HTML template ตาม email_type    │
│  ส่งผ่าน Resend API                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  อัพเดท status: 'sent' / 'failed'      │
│  Retry ถ้าส่งไม่สำเร็จ (max 3 ครั้ง)    │
└─────────────────────────────────────────┘
```

### ตรวจสอบ Email Queue

**ดูสถานะ email ใน database:**

```sql
-- ดู pending emails
SELECT * FROM email_queue WHERE status = 'pending';

-- ดู sent emails
SELECT * FROM email_queue WHERE status = 'sent';

-- ดู failed emails
SELECT * FROM email_queue WHERE status = 'failed';

-- นับจำนวนตามสถานะ
SELECT status, COUNT(*)
FROM email_queue
GROUP BY status;
```

---

## 📞 ต้องการความช่วยเหลือ?

1. ดู Supabase Edge Functions docs: <https://supabase.com/docs/guides/functions>
2. ดู Resend docs: <https://resend.com/docs>
3. เช็ค logs: `supabase functions logs send-booking-confirmation`

---

**ขอให้ deploy สำเร็จ! 🚀**
