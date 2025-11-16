# 📊 Database Migration Instructions - Phase 1

**Objective**: Create database schema for Service Packages V2 with tiered pricing

---

## ⚠️ Before You Start

### Prerequisites
- [ ] Database backup completed
- [ ] Access to Supabase Dashboard
- [ ] SQL Editor access
- [ ] ~5-10 minutes available

### Safety Checklist
- [ ] Working on correct Supabase project
- [ ] Not running on production (use staging first)
- [ ] Have rollback script ready
- [ ] Team notified of migration

---

## 📋 Migration Steps

### Step 1: Create New Tables & Functions

**File**: `supabase-service-packages-v2.sql`

**What it does**:
- Creates `service_packages_v2` table
- Creates `package_pricing_tiers` table
- Creates helper functions (`get_package_price`, `get_required_staff`)
- Creates indexes for performance
- Creates view for package overview

**How to run**:
1. Open Supabase Dashboard → SQL Editor
2. Click "New query"
3. Copy entire contents of `supabase-service-packages-v2.sql`
4. Paste into SQL Editor
5. Click "Run" (or press Cmd/Ctrl + Enter)

**Expected result**:
```
Success. No rows returned
```

**Verify**:
```sql
-- Should return 2 rows
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('service_packages_v2', 'package_pricing_tiers');
```

---

### Step 2: Extend Bookings Table

**File**: `supabase-extend-bookings-table.sql`

**What it does**:
- Adds `area_sqm` column
- Adds `frequency` column (default: 1)
- Adds `calculated_price` column
- Adds `package_v2_id` column
- Creates constraints and indexes

**How to run**:
1. Open new query in SQL Editor
2. Copy entire contents of `supabase-extend-bookings-table.sql`
3. Paste and Run

**Expected result**:
```
NOTICE:  ✅ Bookings table successfully extended
```

**Verify**:
```sql
-- Should return 4 rows
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name IN ('area_sqm', 'frequency', 'calculated_price', 'package_v2_id');
```

---

### Step 3: Test Functions

**File**: `supabase-test-functions.sql`

**What it does**:
- Creates test package with tiers
- Tests price calculation
- Tests staff calculation
- Tests constraints
- Verifies data integrity

**How to run**:

1. Open `supabase-test-functions.sql`

2. **IMPORTANT**: Replace placeholder with real ID:
   - First, create test package and get its ID:
   ```sql
   INSERT INTO service_packages_v2 (
     name, description, service_type, category, pricing_model
   ) VALUES (
     'Deep Cleaning Office (Test)',
     'Test package for tiered pricing',
     'cleaning',
     'office',
     'tiered'
   ) RETURNING id;
   ```

   - Copy the returned UUID

   - In the test file, replace `'YOUR_PACKAGE_ID_HERE'` with actual UUID

3. Run the test file section by section

4. Check results - all tests should pass ✅

**Expected output**:
```
=== Test 1: Table Creation ===
service_packages_v2    | 12
package_pricing_tiers  | 10
bookings               | 25

=== Test 3: Price Calculation ===
Area 50, Freq 1    | 1950 | 1950 | true ✓
Area 150, Freq 2   | 7800 | 7800 | true ✓
...
```

---

## ✅ Verification Checklist

After running all SQL files, verify:

### Tables Created
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE 'service_packages%'
   OR table_name = 'package_pricing_tiers';
```
Expected: 3 rows (service_packages, service_packages_v2, package_pricing_tiers)

### Functions Created
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE 'get_%';
```
Expected: 2 rows (get_package_price, get_required_staff)

### Bookings Table Extended
```sql
\d bookings
```
Expected: Should see new columns (area_sqm, frequency, etc.)

### Constraints Active
```sql
SELECT conname FROM pg_constraint
WHERE conrelid = 'bookings'::regclass
  AND conname LIKE 'check_%';
```
Expected: 2 rows (check_frequency_valid, check_area_positive)

---

## 🔍 Troubleshooting

### Error: "relation already exists"
**Cause**: Tables already created
**Solution**: Either drop existing tables or skip this step

### Error: "column already exists"
**Cause**: Bookings already extended
**Solution**: Skip extend bookings step

### Error: "function does not exist"
**Cause**: Functions not created yet
**Solution**: Run step 1 first

### Error: "permission denied"
**Cause**: Insufficient database permissions
**Solution**: Check Supabase role permissions

### Tests Failing
1. Check if you replaced UUID placeholder
2. Verify test data was inserted
3. Check function definitions
4. Review constraint definitions

---

## 🔄 Rollback Procedure

If something goes wrong:

**File**: `supabase-rollback-migration.sql`

1. Open rollback file
2. Review what it will do (removes all V2 data)
3. Run in SQL Editor
4. Verify rollback success:
```sql
-- Should return 0 rows
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('service_packages_v2', 'package_pricing_tiers');
```

---

## 📊 Post-Migration Status

### Update PRE_MIGRATION_SNAPSHOT.md

Fill in actual numbers:
```sql
-- Count packages
SELECT COUNT(*) FROM service_packages;

-- Count bookings
SELECT COUNT(*) FROM bookings WHERE package_id IS NOT NULL;
```

### Commit Changes

```bash
cd tinedy-crm
git add .
git commit -m "Phase 1 complete: Database schema migrated to V2"
```

---

## 🚀 Next Steps

Once Phase 1 is complete:
- ✅ Database schema ready
- ✅ Functions tested and working
- ✅ Ready for Phase 2: TypeScript Types

**Continue to**: [Phase 2: TypeScript Types & Interfaces](./MIGRATION_PLAN_SERVICE_PACKAGES_V2.md#phase-2-typescript-types--interfaces-2-3-hours)

---

## 📞 Support

If you encounter issues:
1. Check Supabase logs in Dashboard → Logs
2. Review error messages carefully
3. Consult MIGRATION_PLAN for detailed troubleshooting
4. Ask for help if needed

---

**Migration Status**: Phase 1 - Database Schema
**Estimated Time**: 30-60 minutes
**Risk Level**: 🟡 Medium (reversible with rollback script)
