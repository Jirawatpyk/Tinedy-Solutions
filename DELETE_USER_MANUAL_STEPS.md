# ขั้นตอนสร้าง Delete User Edge Function (Manual)

เนื่องจากไม่มี Supabase CLI ให้ทำผ่าน Dashboard แทน

---

## Step 1: เปิด Supabase Dashboard

1. ไปที่ https://supabase.com/dashboard
2. เลือก Project: **Booking CRM Tinedy**
3. คลิก **Edge Functions** (เมนูซ้ายมือ)

---

## Step 2: สร้าง Edge Function ใหม่

1. คลิกปุ่ม **Create new edge function**
2. ใส่ชื่อ: `delete-user`
3. **ลบ code ทั้งหมดในหน้า editor**
4. **เปิดไฟล์ [DELETE_USER_EDGE_FUNCTION.ts](DELETE_USER_EDGE_FUNCTION.ts)**
5. **Copy code ทั้งหมด** (Ctrl+A, Ctrl+C)
6. **Paste ใน Supabase Editor** (Ctrl+V)
7. คลิก **Deploy** (มุมบนขวา)

---

## Step 3: ตั้งค่า Foreign Key Constraint

1. ไปที่ **SQL Editor** (เมนูซ้ายมือ)
2. คลิก **New query**
3. **เปิดไฟล์ [DELETE_USER_SQL.sql](DELETE_USER_SQL.sql)**
4. **Copy SQL ทั้งหมด**
5. **Paste ใน SQL Editor**
6. คลิก **Run** (หรือกด F5)
7. ตรวจสอบผลลัพธ์:
   - ควรเห็น `delete_rule = 'CASCADE'`

---

## Step 4: ทดสอบ Edge Function

### วิธีที่ 1: ทดสอบใน Dashboard

1. ไปที่ **Edge Functions > delete-user**
2. คลิกแท็บ **Invoke**
3. ใส่ JSON:
   ```json
   {
     "userId": "paste-staff-id-here"
   }
   ```
4. คลิก **Send request**
5. ควรได้ response:
   ```json
   {
     "success": true,
     "message": "User deleted successfully"
   }
   ```

### วิธีที่ 2: ทดสอบจากหน้าเว็บ

1. เปิดหน้า **Staff** ในเว็บ
2. กดลบ Staff คนใดก็ได้
3. Confirm ใน Dialog
4. ตรวจสอบ:
   - ✅ หายจากหน้า Staff list
   - ✅ ไปเช็คใน Authentication > Users (ควรหายแล้ว)
   - ✅ ไปเช็คใน Table Editor > profiles (ควรหายแล้ว)

---

## Step 5: ตรวจสอบว่าสร้าง Email เดิมใหม่ได้

1. จด email ของ Staff ที่ลบไป (เช่น staff12@example.com)
2. ไปหน้า **Staff**
3. กด **Add New Staff**
4. ใส่ email เดิม: `staff12@example.com`
5. ใส่ชื่อ และ password ใหม่
6. กด **Create Staff**
7. ✅ ควรสร้างได้สำเร็จ (ถ้าก่อนหน้านี้ error "User already exists")

---

## Troubleshooting

### ❌ Error: "Missing userId"

**สาเหตุ:** ส่ง request ไม่ถูกต้อง

**แก้ไข:** ตรวจสอบ JSON body:
```json
{
  "userId": "actual-user-id-here"
}
```

### ❌ Error: "User not found"

**สาเหตุ:** userId ไม่ถูกต้องหรือลบไปแล้ว

**แก้ไข:**
1. ไปที่ Authentication > Users
2. หา user ที่ต้องการลบ
3. คัดลอก UUID จากคอลัมน์ **id**
4. ใช้ UUID นั้นใน request

### ❌ Error: "Foreign key violation"

**สาเหตุ:** ยังไม่ได้ตั้งค่า CASCADE DELETE

**แก้ไข:**
1. รัน SQL ใน Step 3 อีกครั้ง
2. ตรวจสอบว่า `delete_rule = 'CASCADE'`

### ❌ Edge Function ไม่ทำงาน

**แก้ไข:**
1. เช็ค Logs: Edge Functions > delete-user > Logs
2. เช็ค Environment Variables:
   - `SUPABASE_URL` = https://homtefwwsrrwfzmxdnrk.supabase.co
   - `SUPABASE_SERVICE_ROLE_KEY` = (จาก Settings > API)

---

## สรุปไฟล์ที่ต้องใช้

| ไฟล์ | ใช้กับ | วิธีใช้ |
|------|--------|---------|
| `DELETE_USER_EDGE_FUNCTION.ts` | Edge Functions Editor | Copy → Paste → Deploy |
| `DELETE_USER_SQL.sql` | SQL Editor | Copy → Paste → Run |
| `DELETE_USER_MANUAL_STEPS.md` | คู่มือนี้ | อ่านทำตาม |

---

## เสร็จแล้ว!

ตอนนี้:
- ✅ ลบ Staff จะลบทั้ง `auth.users` และ `profiles`
- ✅ สร้าง email เดิมใหม่ได้
- ✅ User ที่ลบแล้ว login ไม่ได้อีก
