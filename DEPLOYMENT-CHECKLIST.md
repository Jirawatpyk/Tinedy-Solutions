# 🚀 Deployment Checklist
# V2 Tiered Pricing System - Production Deployment

**Project:** Tinedy CRM - V2 Tiered Pricing
**Version:** 2.0
**Date:** 11 มกราคม 2025

---

## 📋 Pre-Deployment Checklist

### 1. Code Review & Quality

- [ ] ✅ All Phase 5 changes code reviewed
- [ ] ✅ TypeScript types ครบถ้วน (no `any`)
- [ ] ✅ ESLint warnings = 0
- [ ] ✅ Debug console.logs ถูกลบหมดแล้ว
- [ ] ✅ No hardcoded values (use environment variables)
- [ ] ✅ Comments และ documentation ครบถ้วน

### 2. Testing

- [ ] Manual testing checklist 100% pass
- [ ] V2 booking creation flow tested
- [ ] V2 booking edit flow tested
- [ ] V2 display ใน 7 pages tested:
  - [ ] Bookings List
  - [ ] Calendar
  - [ ] Weekly Schedule
  - [ ] Customer Profile
  - [ ] Team Detail
  - [ ] Dashboard
  - [ ] Reports
- [ ] V1 regression tests pass
- [ ] Edge cases tested
- [ ] Package selection persistence tested
- [ ] No console errors
- [ ] No browser warnings

### 3. Database

- [ ] ✅ Migration `20250111_make_service_package_id_nullable.sql` applied
- [ ] ✅ Constraint `bookings_package_check` exists
- [ ] Database backup สร้างแล้ว (pre-deployment)
- [ ] Validation queries รันสำเร็จ:
  - [ ] No orphaned V2 bookings
  - [ ] No tier coverage gaps
  - [ ] No constraint violations
- [ ] V2 Packages มีอย่างน้อย 1 package พร้อม tiers

### 4. Documentation

- [ ] ✅ [USER-GUIDE-V2-TIERED-PRICING.md](USER-GUIDE-V2-TIERED-PRICING.md) created
- [ ] ✅ [ADMIN-GUIDE-V2-PACKAGE-MANAGEMENT.md](ADMIN-GUIDE-V2-PACKAGE-MANAGEMENT.md) created
- [ ] ✅ [TESTING-CHECKLIST.md](TESTING-CHECKLIST.md) created
- [ ] ✅ [PHASE7-TESTING-VALIDATION-PLAN.md](PHASE7-TESTING-VALIDATION-PLAN.md) created
- [ ] ✅ [CHANGELOG-PHASE5-V2-SYSTEM-WIDE-INTEGRATION.md](CHANGELOG-PHASE5-V2-SYSTEM-WIDE-INTEGRATION.md) created
- [ ] README.md updated with V2 features

### 5. Environment Configuration

- [ ] Environment variables checked:
  - [ ] `VITE_SUPABASE_URL` correct
  - [ ] `VITE_SUPABASE_ANON_KEY` correct
  - [ ] Production env ≠ Development env
- [ ] `.env.production` file exists
- [ ] Secrets stored securely (not in git)

---

## 🔧 Deployment Steps

### Step 1: Final Code Freeze

```bash
# 1. Ensure you're on main branch
git checkout main
git pull origin main

# 2. Create release branch
git checkout -b release/v2.0-tiered-pricing

# 3. Verify no uncommitted changes
git status
```

- [ ] Code freeze announced to team
- [ ] No new features merged during deployment
- [ ] Release branch created

---

### Step 2: Build & Test

```bash
# 1. Install dependencies
npm install

# 2. Run linter
npm run lint

# 3. Build for production
npm run build

# 4. Check build output
ls -la dist/
```

**Expected Output:**
```
dist/
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
├── index.html
└── ...
```

- [ ] Build สำเร็จโดยไม่มี errors
- [ ] Build size ไม่เกิน threshold (< 5MB)
- [ ] `dist/` folder มี index.html
- [ ] Assets มี hash ในชื่อไฟล์

---

### Step 3: Database Migration (Production)

⚠️ **CRITICAL:** Backup database ก่อน!

```sql
-- 1. Connect to Production database
-- ใช้ Supabase Dashboard หรือ psql

-- 2. Backup (via Supabase Dashboard)
-- Settings → Database → Backups → Create Backup

-- 3. Verify current state
SELECT COUNT(*) FROM bookings;
SELECT COUNT(*) FROM service_packages_v2;
SELECT COUNT(*) FROM service_packages_v2_tiers;

-- 4. Apply migration (ถ้ายังไม่ได้รัน)
-- Copy-paste จาก: supabase/migrations/20250111_make_service_package_id_nullable.sql
ALTER TABLE bookings
  ALTER COLUMN service_package_id DROP NOT NULL;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_package_check
  CHECK (
    (service_package_id IS NOT NULL AND package_v2_id IS NULL) OR
    (service_package_id IS NULL AND package_v2_id IS NOT NULL)
  );

-- 5. Verify migration
\d bookings  -- check constraints
```

- [ ] ✅ Database backed up
- [ ] ✅ Migration applied successfully
- [ ] ✅ Constraint `bookings_package_check` exists
- [ ] ✅ `service_package_id` is nullable

---

### Step 4: Deploy Application

#### Option A: Vercel/Netlify

```bash
# 1. Deploy to production
npm run build
vercel --prod  # or: netlify deploy --prod

# 2. Verify deployment URL
# Example: https://tinedy-crm.vercel.app
```

#### Option B: Manual Server

```bash
# 1. Build
npm run build

# 2. Copy dist/ to server
scp -r dist/* user@server:/var/www/tinedy-crm/

# 3. Restart web server (e.g., Nginx)
ssh user@server "sudo systemctl restart nginx"
```

- [ ] Application deployed
- [ ] Production URL accessible
- [ ] No deployment errors

---

### Step 5: Post-Deployment Verification

#### 5.1 Smoke Test (Quick Check)

- [ ] Navigate to production URL
- [ ] Login successful
- [ ] Dashboard loads
- [ ] Navigate to Bookings page
- [ ] Click "New Booking" → Modal opens
- [ ] No console errors

#### 5.2 V2 Feature Verification

**Test 1: Create V2 Booking**
- [ ] Select V2 Package
- [ ] Enter Area & Frequency
- [ ] Calculate Price → Success
- [ ] Fill form & Submit
- [ ] Booking appears in list

**Test 2: Verify Display**
- [ ] Booking shows in Calendar
- [ ] Booking shows in Weekly Schedule
- [ ] Service name shows correctly (not "N/A")

**Test 3: Edit V2 Booking**
- [ ] Open edit modal
- [ ] Package data loaded
- [ ] Change area → Price recalculates
- [ ] Update successful

#### 5.3 V1 Regression Check

- [ ] Create V1 booking → Success
- [ ] V1 booking shows correctly
- [ ] Mixed V1/V2 in list display properly

#### 5.4 Database Validation (Production)

```sql
-- Run validation queries
SELECT
  'V1' as type, COUNT(*) FROM bookings
  WHERE service_package_id IS NOT NULL
UNION ALL
SELECT 'V2', COUNT(*) FROM bookings
  WHERE package_v2_id IS NOT NULL;

-- Check for orphaned bookings
SELECT COUNT(*) FROM bookings b
JOIN service_packages_v2 sp ON b.package_v2_id = sp.id
WHERE sp.pricing_model = 'tiered'
  AND NOT EXISTS (
    SELECT 1 FROM service_packages_v2_tiers t
    WHERE t.package_id = sp.id
      AND b.area_sqm >= t.min_area_sqm
      AND (t.max_area_sqm IS NULL OR b.area_sqm <= t.max_area_sqm)
  );
-- Expected: 0
```

- [ ] V1/V2 counts match expected
- [ ] No orphaned bookings
- [ ] No constraint violations

---

### Step 6: Monitoring Setup

#### 6.1 Error Monitoring

- [ ] Setup error tracking (e.g., Sentry)
  ```javascript
  // vite.config.ts
  import { sentryVitePlugin } from "@sentry/vite-plugin";

  export default defineConfig({
    plugins: [
      react(),
      sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: "tinedy",
        project: "crm"
      })
    ]
  });
  ```

- [ ] Test error tracking:
  - Trigger test error
  - Check Sentry dashboard
  - Error logged successfully

#### 6.2 Performance Monitoring

- [ ] Enable performance metrics
- [ ] Track key metrics:
  - Page load time
  - API response time
  - Database query time

#### 6.3 Alerting

- [ ] Setup alerts for:
  - Error rate > 5%
  - Page load > 5 seconds
  - Database errors
  - Failed bookings

---

## 📊 Rollback Plan

ถ้าเจอปัญหาร้ายแรงใน production:

### Quick Rollback (Frontend Only)

```bash
# 1. Revert to previous deployment
vercel rollback  # or equivalent command

# 2. Verify previous version is live
# Check deployment URL
```

### Full Rollback (Database + Frontend)

```bash
# 1. Revert database migration
-- Connect to production database

-- Drop constraint
ALTER TABLE bookings DROP CONSTRAINT bookings_package_check;

-- Make service_package_id NOT NULL again (if safe)
UPDATE bookings
SET service_package_id = '[default-package-id]'
WHERE service_package_id IS NULL AND package_v2_id IS NOT NULL;

ALTER TABLE bookings
  ALTER COLUMN service_package_id SET NOT NULL;

# 2. Rollback frontend
vercel rollback

# 3. Verify old version works
```

⚠️ **Rollback Criteria:**
- Critical bugs (P0)
- Data loss
- System-wide errors
- Unable to create bookings

---

## 📢 Communication Plan

### Pre-Deployment

- [ ] Send email to team:
  ```
  Subject: CRM Upgrade - V2 Tiered Pricing (11 Jan 2025, 22:00)

  เรียน ทีมทุกท่าน,

  เรากำลังจะอัพเดท CRM system ในวันที่ 11 มกราคม 2568 เวลา 22:00-23:00 น.

  Features ใหม่:
  - V2 Tiered Pricing System
  - ราคาแบบยืดหยุ่นตามพื้นที่และความถี่
  - คำนวณเวลาสิ้นสุดอัตโนมัติ

  ระบบจะ downtime ประมาณ 30-60 นาที
  กรุณาอย่าสร้าง bookings ใหม่ระหว่างเวลานี้

  ขอบคุณครับ/ค่ะ
  ```

### During Deployment

- [ ] Post status update:
  ```
  🟡 Maintenance in progress...
  Expected completion: 23:00
  ```

### Post-Deployment

- [ ] Send success email:
  ```
  Subject: ✅ CRM Upgrade Complete - V2 Tiered Pricing

  อัพเดทเสร็จสมบูรณ์แล้ว!

  ระบบพร้อมใช้งาน: https://crm.tinedy.com

  คู่มือการใช้งาน:
  - User Guide: [link]
  - Admin Guide: [link]

  หากพบปัญหา กรุณาติดต่อ: support@tinedy.com
  ```

- [ ] Schedule training session (optional)

---

## ✅ Post-Deployment Tasks

### Day 1 (Immediate)

- [ ] Monitor error rates (first 24 hours)
- [ ] Check booking creation success rate
- [ ] Verify all pages loading correctly
- [ ] Respond to user feedback/issues

### Week 1

- [ ] Analyze V2 adoption rate:
  ```sql
  SELECT
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE package_v2_id IS NOT NULL) as v2_bookings,
    COUNT(*) as total_bookings
  FROM bookings
  WHERE created_at >= NOW() - INTERVAL '7 days'
  GROUP BY DATE(created_at)
  ORDER BY date;
  ```

- [ ] Review user feedback
- [ ] Fix minor bugs (P2/P3)
- [ ] Update documentation based on feedback

### Week 2-4

- [ ] Performance optimization (if needed)
- [ ] Collect metrics:
  - Average booking time
  - Error rate
  - User satisfaction
- [ ] Plan Phase 8 improvements

---

## 🎯 Success Criteria

Deployment ถือว่าสำเร็จเมื่อ:

- ✅ **Functionality:**
  - V2 bookings สร้างได้สำเร็จ
  - V2 bookings แสดงถูกต้องทุกหน้า
  - V1 bookings ยังทำงานปกติ
  - ไม่มี critical bugs

- ✅ **Performance:**
  - Page load time < 3 seconds
  - API response time < 2 seconds
  - Error rate < 1%

- ✅ **Adoption:**
  - อย่างน้อย 1 V2 booking ใน production
  - Users สามารถใช้งานได้โดยไม่สับสน

- ✅ **Stability:**
  - No crashes ใน 24 ชั่วโมงแรก
  - No data loss
  - No rollback required

---

## 📝 Deployment Log

**Date:** _______________
**Time Start:** _______________
**Time End:** _______________
**Deployed By:** _______________

### Pre-Deployment Checks
- [ ] All checklist items verified
- [ ] Team notified
- [ ] Backup created

### Deployment Events
| Time | Event | Status | Notes |
|------|-------|--------|-------|
| | Build started | | |
| | Build completed | | |
| | Migration applied | | |
| | Application deployed | | |
| | Smoke tests passed | | |
| | V2 feature verified | | |

### Issues Encountered
| Issue | Severity | Resolution | Resolved By |
|-------|----------|------------|-------------|
| | | | |

### Rollback (if applicable)
- [ ] N/A - No rollback needed
- [ ] Rollback performed at: _______________
- [ ] Reason: _______________

---

## 👥 Team Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Developer** | | | |
| **QA Engineer** | | | |
| **DevOps** | | | |
| **Product Manager** | | | |

---

## 📚 References

- [Phase 5 Changelog](CHANGELOG-PHASE5-V2-SYSTEM-WIDE-INTEGRATION.md)
- [Testing Plan](PHASE7-TESTING-VALIDATION-PLAN.md)
- [User Guide](USER-GUIDE-V2-TIERED-PRICING.md)
- [Admin Guide](ADMIN-GUIDE-V2-PACKAGE-MANAGEMENT.md)
- [Migration Helper](supabase/migrations/20250111_v2_data_migration_helper.sql)

---

**Version:** 1.0
**Created:** 2025-01-11
**Last Updated:** 2025-01-11
