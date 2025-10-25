# 📋 Tinedy CRM - Data Retention Policy

## 📅 นโยบายการเก็บข้อมูล

**ข้อความและไฟล์แนบจะถูกเก็บไว้เป็นเวลา 1 ปี (365 วัน)**

---

## 🔧 การติดตั้ง Auto-Cleanup

### ขั้นตอนที่ 1: รัน SQL Script

1. เปิด **Supabase Dashboard**
2. ไปที่ **SQL Editor**
3. คลิก **New Query**
4. Copy โค้ดจาก [`supabase-1year-retention.sql`](supabase-1year-retention.sql)
5. Paste และกด **Run**

### ขั้นตอนที่ 2: ตรวจสอบว่าติดตั้งสำเร็จ

```sql
-- เช็คว่ามี scheduled job หรือไม่
SELECT * FROM cron.job WHERE jobname = 'cleanup-old-messages';
```

ถ้าเห็นผลลัพธ์ = ติดตั้งสำเร็จ ✅

---

## 📊 ตรวจสอบสถิติการเก็บข้อมูล

```sql
-- ดูสถิติข้อความ
SELECT * FROM message_retention_stats;
```

จะแสดง:
- จำนวนข้อความทั้งหมด
- จำนวนข้อความ 30 วันล่าสุด
- จำนวนข้อความ 90 วันล่าสุด
- จำนวนข้อความ 1 ปีล่าสุด
- ข้อความเก่าสุดและใหม่สุด
- ขนาดของตาราง

---

## 🧪 ทดสอบการลบข้อมูล

### ก่อนรันจริง ให้ทดสอบก่อน:

```sql
-- 1. ดูว่ามีข้อความเก่ากว่า 1 ปีกี่ข้อความ
SELECT COUNT(*) as messages_to_delete
FROM messages
WHERE created_at < NOW() - INTERVAL '365 days';

-- 2. ดูข้อความที่จะถูกลบ (10 ข้อความแรก)
SELECT id, message, created_at
FROM messages
WHERE created_at < NOW() - INTERVAL '365 days'
ORDER BY created_at
LIMIT 10;

-- 3. ทดสอบลบ (รันฟังก์ชัน)
SELECT * FROM delete_messages_older_than_1_year();
```

---

## ⚙️ การทำงานของระบบ

### Automatic (แนะนำ - ต้องมี pg_cron)

**ระบบจะทำงานอัตโนมัติ:**
- 🕒 รันทุกวันเวลา **03:00 น.**
- 🗑️ ลบข้อความเก่ากว่า **365 วัน**
- 📝 บันทึกไฟล์ที่ต้องลบใน `files_to_cleanup`

### Manual (ถ้าไม่มี pg_cron)

**รัน SQL นี้เป็นระยะ (เช่น เดือนละครั้ง):**

```sql
SELECT * FROM delete_messages_older_than_1_year();
```

---

## 🗂️ การจัดการไฟล์ใน Storage

### ปัญหา: SQL ไม่สามารถลบไฟล์จาก Supabase Storage ได้โดยตรง

**วิธีแก้:**

### ตัวเลือกที่ 1: ลบด้วยตนเอง (ทุก 1-3 เดือน)

1. รัน SQL เพื่อดูไฟล์ที่ต้องลบ:
```sql
SELECT file_url FROM files_to_cleanup ORDER BY deleted_at LIMIT 100;
```

2. ไปที่ **Supabase Dashboard** > **Storage** > **chat-attachments**
3. ลบไฟล์ที่เก่ากว่า 1 ปี

4. ลบ log:
```sql
DELETE FROM files_to_cleanup WHERE deleted_at < NOW() - INTERVAL '7 days';
```

### ตัวเลือกที่ 2: สร้าง Edge Function (Advanced)

สร้าง Supabase Edge Function ที่:
1. อ่านตาราง `files_to_cleanup`
2. ลบไฟล์จาก Storage API
3. ลบ record จาก `files_to_cleanup`

---

## 📈 การปรับแต่งระยะเวลา

### เปลี่ยนจาก 1 ปี เป็น 2 ปี:

```sql
-- Update function
CREATE OR REPLACE FUNCTION delete_messages_older_than_1_year()
RETURNS TABLE(...) AS $$
BEGIN
  -- เปลี่ยนจาก 365 เป็น 730 วัน
  DELETE FROM messages
  WHERE created_at < NOW() - INTERVAL '730 days';
  ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### เปลี่ยนจาก 1 ปี เป็น 6 เดือน:

```sql
-- เปลี่ยนจาก 365 เป็น 180 วัน
DELETE FROM messages
WHERE created_at < NOW() - INTERVAL '180 days';
```

---

## ⚠️ คำเตือน

### ก่อนเปิดใช้งาน Auto-Cleanup:

1. ✅ **ทดสอบก่อน** ด้วยการรันฟังก์ชันด้วยตนเอง
2. ✅ **Backup ข้อมูล** ก่อน (Export ข้อความสำคัญ)
3. ✅ **แจ้งทีม** ให้ทราบนโยบายการลบข้อมูล
4. ✅ **ตรวจสอบกฎหมาย** PDPA หรือข้อกำหนดทางธุรกิจ

### ข้อควรระวัง:

- ❌ **ข้อมูลที่ถูกลบแล้วกู้คืนไม่ได้**
- ❌ ไฟล์ใน Storage ต้องลบแยกต่างหาก
- ⚠️ pg_cron ต้องใช้ Supabase Pro tier ($25/เดือน)

---

## 🔍 การตรวจสอบและ Monitoring

### ตรวจสอบว่า Cron Job ทำงานหรือไม่:

```sql
-- ดู job ทั้งหมด
SELECT * FROM cron.job;

-- ดู job history
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-old-messages')
ORDER BY start_time DESC
LIMIT 10;
```

### แจ้งเตือนเมื่อมีข้อความถูกลบ:

คุณสามารถตั้งค่า Email notification ผ่าน Supabase หรือใช้ External monitoring tool

---

## 📞 การยกเลิก Auto-Cleanup

```sql
-- หยุด cron job
SELECT cron.unschedule('cleanup-old-messages');

-- ลบ function (ถ้าต้องการ)
DROP FUNCTION IF EXISTS delete_messages_older_than_1_year();

-- ลบ trigger (ถ้าต้องการ)
DROP TRIGGER IF EXISTS log_attachments_trigger ON messages;
DROP FUNCTION IF EXISTS log_attachments_for_cleanup();

-- ลบ table (ถ้าต้องการ)
DROP TABLE IF EXISTS files_to_cleanup;
```

---

## 📚 สรุป Timeline

| เวลา | สิ่งที่เกิดขึ้น |
|------|----------------|
| **วันนี้** | ส่งข้อความ + รูปภาพ |
| **30 วัน** | ข้อความยังอยู่ |
| **90 วัน** | ข้อความยังอยู่ |
| **365 วัน** | ข้อความยังอยู่ |
| **366 วัน** | ข้อความถูกลบอัตโนมัติ 🗑️ |

---

## ✅ Checklist การติดตั้ง

- [ ] รัน `supabase-1year-retention.sql` ใน SQL Editor
- [ ] ตรวจสอบว่ามี cron job ถูกสร้าง
- [ ] ทดสอบรันฟังก์ชันด้วยตนเอง
- [ ] ตรวจสอบ `message_retention_stats`
- [ ] แจ้งทีมให้ทราบนโยบาย
- [ ] ตั้ง reminder ตรวจสอบทุก 3 เดือน
- [ ] วางแผนลบไฟล์ใน Storage (ทุก 3 เดือน)

---

**Last Updated:** October 25, 2025
**Policy:** Delete messages older than 1 year (365 days)
