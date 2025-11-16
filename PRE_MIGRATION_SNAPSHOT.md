# 📸 Pre-Migration Database Snapshot

**Date**: 2025-01-11
**Branch**: feature/cleaning-tiered-pricing
**Purpose**: Document current database state before Service Packages V2 migration

---

## 📊 Current Database Schema

### service_packages Table (V1)

```sql
CREATE TABLE service_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  service_type TEXT NOT NULL CHECK (service_type IN ('cleaning', 'training')),
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Fields**:
- `id`: UUID primary key
- `name`: Package name (e.g., "Deep Cleaning Condo")
- `description`: Optional description
- `service_type`: 'cleaning' or 'training'
- `duration_minutes`: Service duration
- `price`: Fixed price (single value)
- `is_active`: Active status
- `created_at`, `updated_at`: Timestamps

### bookings Table (Current)

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  package_id UUID REFERENCES service_packages(id),
  -- ... other fields
  price DECIMAL(10, 2),  -- Copied from package at booking time
  -- Missing: area_sqm, frequency, calculated_price
);
```

---

## 📈 Current Data Statistics

### To be executed in Supabase SQL Editor:

```sql
-- Count total packages
SELECT COUNT(*) as total_packages FROM service_packages;

-- Count by service type
SELECT
  service_type,
  COUNT(*) as count,
  AVG(price) as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM service_packages
GROUP BY service_type;

-- Count active vs inactive
SELECT
  is_active,
  COUNT(*) as count
FROM service_packages
GROUP BY is_active;

-- Count bookings using packages
SELECT COUNT(*) as total_bookings_with_packages
FROM bookings
WHERE package_id IS NOT NULL;

-- Package usage statistics
SELECT
  sp.name,
  sp.service_type,
  sp.price,
  COUNT(b.id) as booking_count,
  SUM(b.price) as total_revenue
FROM service_packages sp
LEFT JOIN bookings b ON sp.id = b.package_id
GROUP BY sp.id, sp.name, sp.service_type, sp.price
ORDER BY booking_count DESC;
```

---

## 🎯 Expected Results (To Fill In)

### Package Count

```
Total Packages: _____
  - Cleaning: _____
  - Training: _____
  - Active: _____
  - Inactive: _____
```

### Price Range

```
Cleaning Services:
  - Min Price: _____ บาท
  - Max Price: _____ บาท
  - Avg Price: _____ บาท
```

### Booking Statistics

```
Total Bookings with Packages: _____
Most Popular Package: _____
Total Revenue from Packages: _____ บาท
```

---

## 📋 Pre-Migration Checklist

### Database Backup

- [ ] **Supabase Project Settings** → **Database** → **Download backup**
  - File name: `tinedy-crm-backup-2025-01-11.dump`
  - Location: Local backup folder

- [ ] **Export service_packages table**
  ```sql
  COPY (SELECT * FROM service_packages) TO STDOUT WITH CSV HEADER;
  ```
  - Save to: `backups/service_packages_2025-01-11.csv`

- [ ] **Export bookings table** (with package references)
  ```sql
  COPY (
    SELECT b.*, sp.name as package_name, sp.price as package_price
    FROM bookings b
    LEFT JOIN service_packages sp ON b.package_id = sp.id
  ) TO STDOUT WITH CSV HEADER;
  ```
  - Save to: `backups/bookings_with_packages_2025-01-11.csv`

### Code Backup

- [x] **Git commit checkpoint** - Committed to `main` branch
- [x] **Create feature branch** - `feature/cleaning-tiered-pricing`
- [ ] **Tag release** (optional)
  ```bash
  git tag -a v2.0-pre-migration -m "Before Service Packages V2 migration"
  git push origin v2.0-pre-migration
  ```

### Documentation

- [x] **Migration Plan** - MIGRATION_PLAN_SERVICE_PACKAGES_V2.md
- [x] **Migration Scope** - MIGRATION_SCOPE.md
- [x] **Database Schema V2** - supabase-service-packages-v2.sql
- [x] **This Snapshot** - PRE_MIGRATION_SNAPSHOT.md

---

## 🔄 Rollback Information

### If migration fails, rollback with:

**Option 1: Restore Supabase Backup**
```bash
# In Supabase Dashboard:
# Settings → Database → Restore from backup
# Select: tinedy-crm-backup-2025-01-11.dump
```

**Option 2: Manual Rollback SQL**
```sql
-- Drop new tables
DROP TABLE IF EXISTS package_pricing_tiers CASCADE;
DROP TABLE IF EXISTS service_packages_v2 CASCADE;

-- Remove new columns from bookings
ALTER TABLE bookings DROP COLUMN IF EXISTS area_sqm;
ALTER TABLE bookings DROP COLUMN IF EXISTS frequency;
ALTER TABLE bookings DROP COLUMN IF EXISTS calculated_price;
ALTER TABLE bookings DROP COLUMN IF EXISTS package_v2_id;

-- Verify original tables intact
SELECT COUNT(*) FROM service_packages;
SELECT COUNT(*) FROM bookings WHERE package_id IS NOT NULL;
```

**Option 3: Git Revert**
```bash
# Revert code changes
git checkout main
git branch -D feature/cleaning-tiered-pricing

# Or reset to checkpoint
git reset --hard v2.0-pre-migration
```

---

## 📞 Emergency Contacts

### Technical Issues
- **Developer**: [Your Name/Contact]
- **Database Admin**: [Contact if separate]
- **Supabase Support**: support@supabase.com

### Rollback Decision Makers
- **Project Lead**: [Name]
- **Tech Lead**: [Name]

---

## ✅ Verification Steps

After running pre-migration queries, verify:

- [ ] Can connect to Supabase
- [ ] All tables accessible
- [ ] Data counts match expectations
- [ ] Backup files downloaded and verified
- [ ] Rollback scripts tested (on copy if possible)
- [ ] Team notified of migration start

---

## 🎬 Ready to Proceed?

Once all checklist items are completed:

1. ✅ Database backup secured
2. ✅ Git checkpoint created
3. ✅ Current data documented
4. ✅ Rollback plan ready
5. ✅ Team notified

**Status**: 🟡 Awaiting database backup completion

**Next Step**: Execute Phase 1 - Database Schema Migration

---

*Snapshot taken by: Claude Code*
*Reviewed by: _________________*
*Date: 2025-01-11*
