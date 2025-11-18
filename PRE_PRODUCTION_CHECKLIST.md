# 🚀 Pre-Production Deployment Checklist

**Project:** Tinedy CRM - Manager Role Implementation
**Version:** 2.1
**Last Updated:** 2025-11-18

---

## 📋 Overview

This checklist ensures all critical tasks are completed before deploying the Manager Role Implementation to production. Follow each step carefully and mark items as complete only when verified.

---

## 🔴 CRITICAL - Must Complete Before Deployment

### 1. 🔐 Enable Row Level Security (RLS)

**Status:** ⚠️ **NOT ENABLED** - MUST DO FIRST

**Why Critical:** Without RLS, anyone with the anon key can access all data directly via Supabase API, bypassing frontend permissions entirely.

**Steps to Enable:**

1. **Backup Database**
   ```bash
   # Via Supabase Dashboard:
   # Settings → Database → Backups → Create backup
   ```

2. **Run RLS Migration**
   - Open Supabase Dashboard → SQL Editor
   - Create New Query
   - Copy entire contents from `supabase/migrations/enable_rls_policies_v2.sql`
   - Click **Run** or press `Ctrl+Enter`

3. **Verify RLS Enabled**

   Run this query in SQL Editor:
   ```sql
   SELECT
     tablename,
     CASE
       WHEN relrowsecurity THEN '✅ RLS Enabled'
       ELSE '❌ RLS Disabled'
     END as rls_status
   FROM pg_tables
   LEFT JOIN pg_class ON pg_tables.tablename = pg_class.relname
   WHERE schemaname = 'public'
     AND tablename IN (
       'profiles', 'customers', 'bookings', 'service_packages',
       'teams', 'team_members', 'messages', 'notifications', 'reviews'
     )
   ORDER BY tablename;
   ```

   **Expected Result:** All tables show `✅ RLS Enabled`

4. **Verify Policies Created**

   Run this query:
   ```sql
   SELECT tablename, COUNT(*) as policy_count
   FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN (
       'profiles', 'customers', 'bookings', 'service_packages',
       'teams', 'team_members', 'messages', 'notifications', 'reviews'
     )
   GROUP BY tablename
   ORDER BY tablename;
   ```

   **Expected Result:**
   - bookings: 4 policies
   - customers: 4 policies
   - profiles: 4 policies
   - teams: 4 policies
   - team_members: 4 policies
   - service_packages: 4 policies
   - messages: 4 policies
   - notifications: 4 policies
   - reviews: 3 policies

**Completion Checklist:**
- [ ] Database backed up
- [ ] enable_rls_policies_v2.sql executed successfully
- [ ] All 9 tables show RLS Enabled
- [ ] All policy counts correct
- [ ] No errors in Supabase logs

**References:**
- Detailed guide: `RLS_SECURITY_SETUP.md`
- Migration file: `supabase/migrations/enable_rls_policies_v2.sql`

---

## 🟡 HIGH PRIORITY - Complete Before Launch

### 2. 🧪 Manual Testing

Test all role-based functionality manually:

#### Admin Testing
- [ ] Admin can login
- [ ] Admin redirects to `/admin`
- [ ] Admin can view all bookings
- [ ] Admin can create bookings
- [ ] Admin can update bookings
- [ ] Admin can **hard delete** bookings (permanent)
- [ ] Admin can view all customers
- [ ] Admin can create/update/delete customers
- [ ] Admin can view all staff
- [ ] Admin can create/update/delete staff
- [ ] Admin can assign roles (admin, manager, staff)
- [ ] Admin can access Settings page
- [ ] Admin can view reports with full financial data
- [ ] Admin can export data

#### Manager Testing
- [ ] Manager can login
- [ ] Manager redirects to `/manager`
- [ ] Manager can view all bookings
- [ ] Manager can create bookings
- [ ] Manager can update bookings
- [ ] Manager **CANNOT** hard delete bookings (button not shown)
- [ ] Manager **CAN** archive bookings (soft delete)
- [ ] Manager can restore archived bookings
- [ ] Manager can view all customers
- [ ] Manager can create/update customers
- [ ] Manager **CANNOT** delete customers (button not shown)
- [ ] Manager can view staff list
- [ ] Manager can update staff assignments
- [ ] Manager **CANNOT** create/delete staff
- [ ] Manager **CANNOT** assign roles
- [ ] Manager **BLOCKED** from /admin/settings (shows "Access Denied")
- [ ] Manager can view reports
- [ ] Manager can export data

#### Staff Testing
- [ ] Staff can login
- [ ] Staff redirects to `/staff`
- [ ] Staff can view **only assigned** bookings
- [ ] Staff **CANNOT** create bookings
- [ ] Staff **CANNOT** view all customers
- [ ] Staff **CANNOT** view reports
- [ ] Staff can view own profile
- [ ] Staff can update own profile

---

### 3. 🔒 Security Verification

- [ ] RLS policies prevent Manager from hard deleting
- [ ] RLS policies prevent Staff from viewing unassigned bookings
- [ ] Manager cannot access `/admin/settings` (403/redirect)
- [ ] Manager cannot access `/admin/packages`
- [ ] Direct API calls respect RLS policies
- [ ] Test with actual Supabase client (not admin bypass)

---

### 4. ⚡ Performance Testing

- [ ] Page load times < 3 seconds
- [ ] No console errors in production mode
- [ ] Database queries optimized (check slow query log)
- [ ] No memory leaks in long sessions

---

## 🟢 RECOMMENDED - Should Complete

### 5. 📊 Data Verification

- [ ] All existing users have correct roles assigned
- [ ] No users have NULL role
- [ ] Test data cleaned from production
- [ ] Sample bookings have proper assignments

---

### 6. 📚 Documentation

- [ ] DEPLOYMENT.md updated with RLS steps
- [ ] README.md includes RLS warning
- [ ] Migration guides available
- [ ] User guides distributed to managers

---

### 7. 🔄 Rollback Plan

- [ ] Database backup created and verified
- [ ] Rollback SQL script prepared
- [ ] Previous version deployment ready
- [ ] Team knows rollback procedures

**Rollback SQL (if needed):**
```sql
-- Revert to 2-role system
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'staff'));

-- Downgrade manager users to admin (adjust as needed)
UPDATE profiles SET role = 'admin' WHERE role = 'manager';
```

---

## 🎯 Deployment Day Checklist

### Pre-Deployment (1 hour before)
- [ ] Notify team of deployment time
- [ ] Ensure all users logged out
- [ ] Create final database backup
- [ ] Review change log

### During Deployment
- [ ] Deploy database migrations
- [ ] Enable RLS policies
- [ ] Deploy application code
- [ ] Verify deployment successful
- [ ] Run smoke tests

### Post-Deployment (first 30 minutes)
- [ ] Monitor error logs
- [ ] Test critical user flows
- [ ] Verify RLS working
- [ ] Check performance metrics
- [ ] Confirm all roles working

### Post-Deployment (first 24 hours)
- [ ] Monitor user feedback
- [ ] Check database performance
- [ ] Review Supabase logs
- [ ] Monitor error tracking (if integrated)

---

## 🆘 Emergency Contacts

**If issues occur:**

1. **Database Issues:**
   - Supabase Dashboard → Database → Logs
   - Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'table_name'`

2. **Permission Issues:**
   - Verify user role: `SELECT role FROM profiles WHERE id = auth.uid()`
   - Check helper functions: `SELECT get_user_role()`

3. **Rollback Required:**
   - Follow rollback plan above
   - Restore database from backup
   - Deploy previous version

---

## ✅ Sign-Off

**Pre-Production Testing:**
- [ ] Admin functionality verified
- [ ] Manager functionality verified
- [ ] Staff functionality verified
- [ ] RLS policies enabled and tested
- [ ] Security audit passed
- [ ] Performance acceptable

**Deployment Ready:**
- [ ] All critical tasks complete
- [ ] Team trained on new features
- [ ] Rollback plan prepared
- [ ] Monitoring tools ready

---

**Deployment Approved By:** _______________________
**Date:** _______________________
**Production URL:** _______________________

---

## 📞 Support Resources

- **RLS Setup Guide:** `RLS_SECURITY_SETUP.md`
- **Manager Role Guide:** `USER_GUIDE_MANAGER_ROLE.md`
- **Migration Guide:** `MANAGER_ROLE_MIGRATION_GUIDE.md`
- **Admin Guide:** `ADMIN_GUIDE_USER_MANAGEMENT.md`
- **Deployment Guide:** `DEPLOYMENT.md`

---

**Remember:** 🚨 **RLS MUST BE ENABLED BEFORE PRODUCTION** 🚨

Without RLS, the permission system provides NO security at the database level!
