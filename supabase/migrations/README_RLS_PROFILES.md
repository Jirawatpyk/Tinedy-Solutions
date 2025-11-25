# Profiles RLS (Row Level Security) - Migration Guide

## 📋 Overview

This document explains the RLS setup for the `profiles` table and how to troubleshoot common issues.

## 🎯 Current State (2025-02-05)

### Active Migration
- **File**: `20250205_fix_profiles_rls_properly.sql`
- **Status**: ✅ Properly configured
- **RLS**: ENABLED
- **Policies**: 4 policies (SELECT, UPDATE, INSERT, DELETE)

### Design Pattern
Uses **direct subquery pattern** instead of helper functions to avoid infinite recursion:

```sql
CREATE POLICY "policy_name" ON profiles
  USING (
    auth.uid() = id  -- Fast path: check own profile first
    OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
    -- Subquery runs once, no recursion
  );
```

## 📜 Migration History

### Timeline of RLS Issues

| Date | Migration | Issue | Status |
|------|-----------|-------|--------|
| 2025-01-17 | `20250117_fix_profiles_rls_policies.sql` | Initial RLS setup | ✅ Working initially |
| 2025-02-01 | `20250201_fix_profiles_rls_for_chat.sql` | Added `get_current_user_role()` | ❌ Infinite recursion |
| 2025-02-04 | `20250204_fix_infinite_recursion_login.sql` | Tried JWT approach | ❌ Still broken |
| 2025-02-04 | `20250204_emergency_disable_rls_temporarily.sql` | **Emergency: DISABLED RLS** | ⚠️ Security risk |
| 2025-02-05 | `20250205_fix_profiles_rls_properly.sql` | **Current: Fixed with subquery** | ✅ Working |

### Root Cause of Past Issues

**Infinite Recursion Pattern** (DON'T DO THIS):
```sql
-- ❌ BAD: Helper function creates recursion
CREATE FUNCTION get_role() RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql;

CREATE POLICY "check" ON profiles
  USING (get_role() = 'admin');
  -- ^ This causes infinite loop!
  -- Policy needs to query profiles → calls RLS → calls function → queries profiles → ...
```

**Correct Pattern** (DO THIS):
```sql
-- ✅ GOOD: Direct subquery, no recursion
CREATE POLICY "check" ON profiles
  USING (
    auth.uid() = id  -- Check own first (fast)
    OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    -- Postgres optimizer runs this once per query
  );
```

## 🛠️ Files in This Directory

### 1. Fix Migration (Primary)
**File**: `20250205_fix_profiles_rls_properly.sql`

**What it does**:
- Re-enables RLS on profiles table
- Drops all old policies (prevents conflicts)
- Creates 4 new, non-recursive policies:
  1. SELECT: Users view own + Admins/Managers view all
  2. UPDATE: Users update own + Admins/Managers update all
  3. INSERT: Only service_role (Edge Functions)
  4. DELETE: Only admins

**When to run**:
- If RLS is disabled
- If you see "Error fetching profile" errors
- If login is broken

### 2. Rollback Migration (Emergency)
**File**: `20250205_rollback_profiles_rls.sql`

**What it does**:
- Disables RLS temporarily
- Drops new policies
- Restores emergency mode (login works but insecure)

**When to run**:
- ⚠️ **EMERGENCY ONLY**
- After fix migration if login still broken
- If you see "infinite recursion detected" error

**⚠️ WARNING**: Running this disables security! Use only temporarily.

### 3. Verification Script
**File**: `20250205_verify_profiles_rls.sql`

**What it does**:
- Checks RLS status (enabled/disabled)
- Counts policies (should be 4)
- Lists policy details
- Provides troubleshooting guidance

**When to run**:
- After applying fix migration
- Before deploying to production
- When troubleshooting RLS issues

## 🚀 How to Use

### Scenario 1: Fresh Setup or Fix Issues

```bash
# Step 1: Verify current state
# Go to Supabase Dashboard → SQL Editor
# Run: 20250205_verify_profiles_rls.sql
# Check if RLS is disabled or policies are wrong

# Step 2: Apply fix
# Run: 20250205_fix_profiles_rls_properly.sql
# This will enable RLS and create correct policies

# Step 3: Verify fix worked
# Run: 20250205_verify_profiles_rls.sql again
# Should show: "✅ PASS - All checks OK"

# Step 4: Test manually
# 1. Logout from CRM
# 2. Login with staff account
# 3. Check console - no errors
# 4. Verify profile loads correctly
```

### Scenario 2: Emergency Rollback

```bash
# If fix causes login issues:

# Step 1: Run rollback
# Run: 20250205_rollback_profiles_rls.sql
# This will disable RLS temporarily

# Step 2: Verify login works
# Login to CRM should work now

# Step 3: File incident
# Document what went wrong
# Create ticket for proper fix

# Step 4: Fix properly within 24 hours
# ⚠️ RLS is disabled - security risk!
```

## 🧪 Testing Checklist

After applying fix migration:

- [ ] **Test 1**: Staff user can login
- [ ] **Test 2**: Staff user sees only own profile
  ```typescript
  // Should return null or error
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', 'other-user-id')
    .single()
  ```
- [ ] **Test 3**: Admin sees all profiles
  ```typescript
  // Should return all profiles
  const { data } = await supabase
    .from('profiles')
    .select('*')
  ```
- [ ] **Test 4**: Create staff via Edge Function
  - Go to Staff Management
  - Click "Add New Staff"
  - Fill form and submit
  - Should succeed
- [ ] **Test 5**: Realtime updates work
  - Open 2 tabs (admin + staff)
  - Admin edits staff profile
  - Staff tab should auto-update

## 🔍 Troubleshooting

### Issue: "Error fetching profile"

**Symptoms**:
```
[ERROR] [AuthContext] Error fetching profile
» object { error: {}, userId: "..." }
```

**Likely Cause**: RLS is disabled or policies are missing

**Fix**:
1. Run verification script to check status
2. If RLS disabled, run fix migration
3. Clear browser cache and localStorage
4. Try login again

### Issue: "Infinite recursion detected"

**Symptoms**:
- Login hangs
- Database errors in Supabase logs
- Query timeouts

**Likely Cause**: Helper function creating recursion loop

**Fix**:
1. Run rollback migration (temporary)
2. Check for any custom RLS functions calling profiles table
3. Remove problematic functions
4. Run fix migration

### Issue: Login works but security broken

**Symptoms**:
- Staff can see other users' profiles
- No RLS errors
- Verification shows "RLS Disabled"

**Likely Cause**: RLS is disabled (emergency mode active)

**Fix**:
1. **URGENT**: Run fix migration immediately
2. Verify RLS enabled with verification script
3. Test access restrictions

### Issue: Fix migration fails

**Symptoms**:
- SQL errors when running fix migration
- Policies not created
- RLS state unchanged

**Possible Causes & Fixes**:

1. **Conflicting policies exist**
   ```sql
   -- Manually drop all policies first
   DROP POLICY IF EXISTS policy_name ON profiles;
   -- Then run fix migration
   ```

2. **Insufficient permissions**
   - Ensure you're running as superuser or owner
   - Check database role permissions

3. **Database in read-only mode**
   - Check Supabase project status
   - Verify not paused or suspended

## 📚 RLS Best Practices

### ✅ DO:
- Use direct subqueries in policy USING clauses
- Check `auth.uid() = id` first (performance)
- Use JWT metadata for role checks (when possible)
- Test policies thoroughly before production
- Document policy changes

### ❌ DON'T:
- Create helper functions that query the same table
- Use recursive function calls in policies
- Disable RLS without proper rollback plan
- Deploy RLS changes without testing
- Ignore "infinite recursion" warnings

### Performance Tips:
```sql
-- ✅ GOOD: Fast path first
USING (
  auth.uid() = id  -- Returns immediately for own profile
  OR
  (SELECT ...) = 'admin'  -- Only runs if first check fails
)

-- ❌ BAD: Slow check first
USING (
  (SELECT ...) = 'admin'  -- Runs for every query
  OR
  auth.uid() = id
)
```

## 🔐 Security Considerations

### When RLS is ENABLED (Normal Operation):
- ✅ Users see only their own profile
- ✅ Admins/Managers see all profiles
- ✅ Edge Functions can create profiles
- ✅ Only admins can delete profiles
- ✅ PDPA compliant

### When RLS is DISABLED (Emergency Mode):
- 🔴 **HIGH RISK**: All authenticated users see all profiles
- 🔴 **DATA LEAK**: Email, phone, staff_number exposed
- 🔴 **COMPLIANCE**: May violate PDPA regulations
- 🔴 **ACTION**: Must fix within 24 hours

## 📞 Support

### Level 1: Self-Service
1. Run verification script
2. Check this README
3. Review Supabase logs

### Level 2: Team Support
1. Share error logs
2. Attach migration files
3. Document steps taken

### Level 3: Supabase Support
1. Create support ticket
2. Attach migration history
3. Include verification results

## 🎓 Learn More

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Avoiding RLS Recursion](https://supabase.com/docs/guides/auth/row-level-security#policies-with-security-definer-functions)

---

## 📝 Changelog

### 2025-02-05
- ✅ Created comprehensive fix migration
- ✅ Added rollback plan
- ✅ Created verification script
- ✅ Documented troubleshooting steps

### 2025-02-04
- ⚠️ Emergency RLS disable (temporary)
- ❌ Multiple failed fix attempts
- 🐛 Identified infinite recursion root cause

### 2025-02-01
- 🐛 Introduced infinite recursion bug
- ❌ Helper function approach failed

---

**Last Updated**: 2025-02-05
**Maintainer**: Development Team
**Status**: ✅ Active & Documented
