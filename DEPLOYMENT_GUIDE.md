# Payment Confirmation Email - Deployment Guide

## สิ่งที่สร้างแล้ว

### 1. ✅ Supabase Edge Function
ไฟล์: `supabase/functions/send-payment-confirmation/index.ts`
- ส่งอีเมล Payment Confirmation ผ่าน Resend API
- รันบน Supabase server-side (ปลอดภัย)
- บันทึกลง `email_queue` table

### 2. ✅ Database Trigger
ไฟล์: `supabase/migrations/20250125_payment_confirmation_trigger.sql`
- Auto-trigger เมื่อ `payment_status` เปลี่ยนเป็น `'paid'`
- เรียก Edge Function อัตโนมัติ

### 3. ✅ ลบ Client-Side Email Sending
ไฟล์: `src/components/payment/SlipUpload.tsx`
- ลบการส่งอีเมลจาก browser แล้ว
- ให้ database trigger ดูแลแทน

---

## ขั้นตอนการ Deploy

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Link Project

```bash
cd "C:\Users\Jiraw\OneDrive\Desktop\CRM tinedy\tinedy-crm"
supabase link --project-ref homtefwwsrrwfzmxdnrk
```

### Step 4: Set Edge Function Secrets

```bash
supabase secrets set RESEND_API_KEY=re_F5zcULHK_Aq8rNG4TBDQzW2RcGZDSLc6c
```

### Step 5: Deploy Edge Function

```bash
supabase functions deploy send-payment-confirmation
```

### Step 6: Enable pg_net Extension

ใน Supabase Dashboard > SQL Editor รัน:

```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 7: Set Database Settings

ใน Supabase Dashboard > SQL Editor รัน:

```sql
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://homtefwwsrrwfzmxdnrk.supabase.co';
ALTER DATABASE postgres SET app.settings.supabase_anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbXRlZnd3c3Jyd2Z6bXhkbnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTU5NzUsImV4cCI6MjA3NjEzMTk3NX0.HmlukjKxHpWux1XfpmPUCgUmSgqCB7_EnyEHNYIwv0o';
```

### Step 8: Run Migration

```bash
supabase db push
```

หรือในกรณีเทส เที่ยวรัน manual ใน Supabase Dashboard > SQL Editor:

```sql
-- Copy ทั้งหมดจาก supabase/migrations/20250125_payment_confirmation_trigger.sql
-- Paste ใน SQL Editor แล้วกด RUN
```

---

## ทดสอบการทำงาน

### ทดสอบ Edge Function ด้วย Curl:

```bash
curl -X POST https://homtefwwsrrwfzmxdnrk.supabase.co/functions/v1/send-payment-confirmation \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"bookingId": "your-booking-id-here"}'
```

### ทดสอบ Trigger:

1. เข้าหน้าเว็บแล้วอัพโหลดสลิป
2. เช็ค Console ใน Supabase Dashboard > Database > Logs
3. เช็ค Email ใน Resend Dashboard
4. เช็ค Gmail inbox

---

## Troubleshooting

### ถ้าไม่ได้รับอีเมล:

1. **เช็ค Edge Function Logs:**
   ```bash
   supabase functions logs send-payment-confirmation
   ```

2. **เช็ค Trigger Logs:**
   ใน Supabase Dashboard > Database > Logs

3. **เช็ค pg_net Extension:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

4. **เช็ค Database Settings:**
   ```sql
   SHOW app.settings.supabase_url;
   SHOW app.settings.supabase_anon_key;
   ```

5. **เช็ค Resend Dashboard:**
   https://resend.com/emails

---

## สรุป Architecture

```
User Upload Slip
    ↓
SlipUpload.tsx updates payment_status = 'paid'
    ↓
Database Trigger detects change
    ↓
Trigger calls Edge Function via pg_net
    ↓
Edge Function sends email via Resend API
    ↓
Email Queue logged in database
    ↓
User receives Payment Confirmation Email
```

## ข้อดี

✅ **ปลอดภัย** - API key ไม่โดนเปิดเผยใน browser
✅ **Reliable** - ส่งจาก server-side
✅ **Automatic** - Trigger อัตโนมัติไม่ต้องเขียนโค้ดเพิ่ม
✅ **Scalable** - ใช้ Supabase infrastructure
✅ **Logged** - บันทึกทุก email ใน email_queue table
