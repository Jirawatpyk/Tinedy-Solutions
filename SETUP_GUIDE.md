# Tinedy CRM - Setup Guide

## การติดตั้งโครงสร้างโปรเจค

โครงสร้างโปรเจคได้ถูกสร้างเรียบร้อยแล้ว รวมถึง:

### ✅ สิ่งที่สร้างเสร็จแล้ว

1. **โครงสร้างพื้นฐาน**
   - ✅ Vite + React + TypeScript
   - ✅ Tailwind CSS configuration
   - ✅ Path aliases (@/\*\*)
   - ✅ Custom theme (Tinedy colors และ fonts)

2. **UI Components (Shadcn UI)**
   - ✅ Button
   - ✅ Card
   - ✅ Input
   - ✅ Label
   - ✅ Badge
   - ✅ Dialog
   - ✅ Select
   - ✅ Toast/Toaster

3. **Authentication System**
   - ✅ Auth Context
   - ✅ Protected Routes
   - ✅ Login Page
   - ✅ Role-based access (Admin/Staff)

4. **Layout Components**
   - ✅ Sidebar (responsive)
   - ✅ Header
   - ✅ Main Layout

5. **Admin Portal Pages**
   - ✅ Dashboard (with stats และ recent bookings)
   - ✅ Bookings Management (CRUD)
   - ✅ Customers Management (CRUD)
   - ⏳ Calendar (Coming soon)
   - ⏳ Staff Management (Coming soon)
   - ⏳ Teams (Coming soon)
   - ⏳ Chat (Coming soon)
   - ⏳ Workload (Coming soon)
   - ⏳ Service Packages (Coming soon)
   - ⏳ Reports & Analytics (Coming soon)
   - ⏳ Audit Log (Coming soon)
   - ⏳ Settings (Coming soon)

6. **Staff Portal**
   - ⏳ Bookings (Coming soon)
   - ⏳ Calendar (Coming soon)
   - ⏳ Chat (Coming soon)
   - ⏳ Profile (Coming soon)

7. **Database**
   - ✅ Supabase client setup
   - ✅ Database schema SQL (supabase-schema.sql)
   - ✅ TypeScript types
   - ✅ Row Level Security policies

## ขั้นตอนการติดตั้ง

### 1. ติดตั้ง Dependencies

เนื่องจากอาจมีปัญหาใน node_modules ให้ทำตามขั้นตอนนี้:

```bash
cd tinedy-crm

# ลบ node_modules และ package-lock.json (ถ้ามี)
# Windows:
rmdir /s /q node_modules
del package-lock.json

# Mac/Linux:
rm -rf node_modules package-lock.json

# ติดตั้งใหม่
npm install
```

### 2. ตั้งค่า Environment Variables

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env`:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. ตั้งค่า Supabase Database

1. ไปที่ Supabase Dashboard
2. เปิด SQL Editor
3. คัดลอกและรัน SQL จากไฟล์ `supabase-schema.sql`
4. ตรวจสอบว่าสร้างตารางทั้งหมดแล้ว:
   - profiles
   - customers
   - service_packages
   - bookings
   - teams
   - team_members
   - messages
   - audit_logs

### 4. สร้าง Admin User แรก

ใน Supabase:

```sql
-- 1. สร้าง user ใน Authentication
-- ไปที่ Authentication > Users > Add user
-- Email: admin@tinedy.com
-- Password: admin123

-- 2. หลังจากสร้าง user แล้ว ให้อัพเดท profile
-- เปลี่ยน USER_ID_HERE ให้ตรงกับ ID ของ user ที่สร้าง
UPDATE profiles
SET role = 'admin',
    full_name = 'Admin User'
WHERE id = 'USER_ID_HERE';
```

หรือสร้างผ่าน SQL:

```sql
-- เพิ่ม function ช่วยสร้าง user (run ครั้งเดียว)
CREATE OR REPLACE FUNCTION create_admin_user(
  email TEXT,
  password TEXT,
  full_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- สร้าง auth user
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
  ) VALUES (
    email,
    crypt(password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
  ) RETURNING id INTO user_id;

  -- สร้าง profile
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (user_id, email, full_name, 'admin');

  RETURN user_id;
END;
$$;

-- ใช้ function
SELECT create_admin_user(
  'admin@tinedy.com',
  'admin123',
  'Admin User'
);
```

### 5. รันโปรเจค

```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่: http://localhost:5173

## การใช้งาน

### Login
- URL: http://localhost:5173/login
- Email: admin@tinedy.com
- Password: admin123

### เมนู Admin Portal

1. **Dashboard** - ภาพรวมของระบบ
2. **Bookings** - จัดการการจอง
3. **Customers** - จัดการข้อมูลลูกค้า
4. **อื่นๆ** - Coming soon

## โครงสร้างไฟล์

```
tinedy-crm/
├── src/
│   ├── components/
│   │   ├── auth/              # Protected Route
│   │   ├── layout/            # Sidebar, Header, MainLayout
│   │   └── ui/                # Reusable UI components
│   ├── contexts/              # AuthContext
│   ├── hooks/                 # useToast
│   ├── lib/                   # supabase, utils
│   ├── pages/
│   │   ├── admin/             # Dashboard, Bookings, Customers
│   │   └── auth/              # Login
│   ├── types/                 # database.types.ts
│   ├── App.tsx                # Main routing
│   ├── main.tsx               # Entry point
│   └── index.css              # Tailwind + custom styles
├── supabase-schema.sql        # Database schema
├── tailwind.config.js         # Tailwind configuration
├── vite.config.ts             # Vite configuration
└── package.json               # Dependencies
```

## Features ที่สำคัญ

### Mobile-First Design
- ออกแบบให้ทำงานบนมือถือก่อน
- Responsive ทุกหน้าจอ
- Sidebar แบบ slide-in บนมือถือ

### Security
- Row Level Security (RLS) policies
- Role-based access control
- Environment variables
- Protected routes

### Error Handling
- Try-catch ทุก API calls
- Toast notifications สำหรับ feedback
- Loading states

### Best Practices
- TypeScript strict mode
- Proper component composition
- Reusable utilities
- Clean code structure

## การแก้ปัญหา

### ถ้า npm install ไม่สำเร็จ
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### ถ้า Vite ไม่ทำงาน
```bash
npm install -D vite@latest @vitejs/plugin-react@latest
```

### ถ้า TypeScript error
```bash
npm install -D typescript@latest @types/react@latest @types/react-dom@latest
```

### ถ้า Supabase connection error
- ตรวจสอบ `.env` file
- ตรวจสอบว่า Supabase project online
- ตรวจสอบว่ารัน SQL schema แล้ว

## การพัฒนาต่อ

### เพิ่ม Page ใหม่

1. สร้างไฟล์ใน `src/pages/admin/` หรือ `src/pages/staff/`
2. Import ใน `App.tsx`
3. เพิ่ม Route

### เพิ่ม Component ใหม่

1. สร้างไฟล์ใน `src/components/ui/`
2. ตามรูปแบบของ Shadcn UI
3. Export และใช้งาน

### เพิ่ม Database Table

1. เพิ่ม SQL ใน `supabase-schema.sql`
2. รัน SQL ใน Supabase
3. เพิ่ม types ใน `src/types/database.types.ts`

## ขอบคุณที่ใช้ Tinedy CRM!

หากมีปัญหาหรือคำถาม กรุณาติดต่อทีมพัฒนา
