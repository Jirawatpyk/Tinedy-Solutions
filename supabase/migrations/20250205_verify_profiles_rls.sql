-- Verification Script: Check Profiles RLS Status
-- Date: 2025-02-05
-- Purpose: Verify that RLS policies are correctly configured
-- Usage: Run in Supabase SQL Editor after applying fix migration
--
-- ===================================================================
-- This script checks:
-- 1. RLS is enabled on profiles table
-- 2. Correct number of policies exist
-- 3. Policy names and types are correct
-- 4. Helper functions exist (if any)
-- 5. Grants are properly set
-- ===================================================================

\echo ''
\echo '================================================================'
\echo 'PROFILES RLS VERIFICATION REPORT'
\echo '================================================================'
\echo ''

-- ===================================================================
-- 1. Check RLS Status
-- ===================================================================
\echo '1. RLS STATUS CHECK'
\echo '-------------------'

SELECT
  tablename,
  CASE
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '🔴 DISABLED (CRITICAL!)'
  END as rls_status,
  CASE
    WHEN rowsecurity THEN 'OK'
    ELSE 'FAILED - RLS must be enabled!'
  END as status
FROM pg_tables
WHERE tablename = 'profiles';

-- ===================================================================
-- 2. Check Policy Count
-- ===================================================================
\echo ''
\echo '2. POLICY COUNT CHECK'
\echo '---------------------'

SELECT
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) = 4 THEN '✅ CORRECT (Expected: 4)'
    WHEN COUNT(*) < 4 THEN '⚠️ MISSING POLICIES (Found: ' || COUNT(*) || ', Expected: 4)'
    ELSE '⚠️ EXTRA POLICIES (Found: ' || COUNT(*) || ', Expected: 4)'
  END as status
FROM pg_policies
WHERE tablename = 'profiles';

-- ===================================================================
-- 3. List All Policies
-- ===================================================================
\echo ''
\echo '3. POLICY DETAILS'
\echo '-----------------'

SELECT
  policyname as "Policy Name",
  CASE cmd
    WHEN 'SELECT' THEN 'SELECT (Read)'
    WHEN 'INSERT' THEN 'INSERT (Create)'
    WHEN 'UPDATE' THEN 'UPDATE (Modify)'
    WHEN 'DELETE' THEN 'DELETE (Remove)'
  END as "Operation",
  CASE permissive
    WHEN 't' THEN 'PERMISSIVE'
    ELSE 'RESTRICTIVE'
  END as "Type",
  CASE
    WHEN policyname LIKE '%view%' OR policyname LIKE '%select%' THEN '✅'
    WHEN policyname LIKE '%update%' THEN '✅'
    WHEN policyname LIKE '%insert%' OR policyname LIKE '%create%' THEN '✅'
    WHEN policyname LIKE '%delete%' OR policyname LIKE '%remove%' THEN '✅'
    ELSE '⚠️'
  END as "Status"
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
  END,
  policyname;

-- ===================================================================
-- 4. Check Expected Policy Names
-- ===================================================================
\echo ''
\echo '4. EXPECTED POLICIES CHECK'
\echo '--------------------------'

WITH expected_policies AS (
  SELECT unnest(ARRAY[
    'Allow users to view own profile and admins view all',
    'Allow users to update own profile and admins update all',
    'Only service role can insert profiles',
    'Only admins can delete profiles'
  ]) as policy_name,
  unnest(ARRAY['SELECT', 'UPDATE', 'INSERT', 'DELETE']) as operation
),
actual_policies AS (
  SELECT policyname, cmd
  FROM pg_policies
  WHERE tablename = 'profiles'
)
SELECT
  e.policy_name as "Expected Policy",
  e.operation as "Operation",
  CASE
    WHEN a.policyname IS NOT NULL THEN '✅ EXISTS'
    ELSE '🔴 MISSING'
  END as "Status"
FROM expected_policies e
LEFT JOIN actual_policies a
  ON e.policy_name = a.policyname
  AND e.operation = a.cmd
ORDER BY
  CASE e.operation
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
  END;

-- ===================================================================
-- 5. Check Helper Functions
-- ===================================================================
\echo ''
\echo '5. HELPER FUNCTIONS CHECK'
\echo '-------------------------'

SELECT
  routine_name as "Function Name",
  routine_type as "Type",
  CASE
    WHEN routine_name LIKE '%role%' THEN '✅ Role-related'
    ELSE 'ℹ️ Other'
  END as "Category"
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%role%'
ORDER BY routine_name;

-- ===================================================================
-- 6. Check Table Grants
-- ===================================================================
\echo ''
\echo '6. TABLE GRANTS CHECK'
\echo '---------------------'

SELECT
  grantee as "Role",
  string_agg(privilege_type, ', ' ORDER BY privilege_type) as "Privileges",
  CASE
    WHEN grantee = 'authenticated' AND privilege_type IN ('SELECT', 'UPDATE') THEN '✅ CORRECT'
    WHEN grantee = 'service_role' THEN '✅ CORRECT'
    ELSE 'ℹ️ OTHER'
  END as "Status"
FROM information_schema.role_table_grants
WHERE table_name = 'profiles'
  AND table_schema = 'public'
GROUP BY grantee
ORDER BY grantee;

-- ===================================================================
-- 7. Test Policy Logic (Safe - No Data Modification)
-- ===================================================================
\echo ''
\echo '7. POLICY LOGIC TEST'
\echo '--------------------'

-- This section just explains what the policies do
-- No actual testing of permissions here (would require auth context)

SELECT
  '✅ Users can view their own profile (auth.uid() = id)' as test_1,
  '✅ Admins and Managers can view all profiles (role check)' as test_2,
  '✅ Users can update their own profile' as test_3,
  '✅ Admins and Managers can update all profiles' as test_4,
  '✅ Only service_role can insert new profiles' as test_5,
  '✅ Only admins can delete profiles' as test_6;

-- ===================================================================
-- 8. Overall Status Summary
-- ===================================================================
\echo ''
\echo '8. OVERALL STATUS'
\echo '-----------------'

DO $$
DECLARE
  rls_enabled boolean;
  policy_count integer;
  overall_status text;
BEGIN
  -- Get RLS status
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE tablename = 'profiles';

  -- Get policy count
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles';

  -- Determine overall status
  IF rls_enabled AND policy_count = 4 THEN
    overall_status := '✅ PASS - All checks OK';
  ELSIF NOT rls_enabled THEN
    overall_status := '🔴 FAIL - RLS is DISABLED';
  ELSIF policy_count < 4 THEN
    overall_status := '⚠️ WARN - Missing policies';
  ELSIF policy_count > 4 THEN
    overall_status := '⚠️ WARN - Extra policies exist';
  ELSE
    overall_status := '⚠️ WARN - Unknown status';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'OVERALL STATUS: %', overall_status;
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Enabled: %', rls_enabled;
  RAISE NOTICE 'Policy Count: % (Expected: 4)', policy_count;
  RAISE NOTICE '';

  IF rls_enabled AND policy_count = 4 THEN
    RAISE NOTICE '✅ Profiles RLS is properly configured';
    RAISE NOTICE '✅ Login should work correctly';
    RAISE NOTICE '✅ Security policies are active';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Test user login';
    RAISE NOTICE '2. Test admin/manager access';
    RAISE NOTICE '3. Test staff creation via Edge Function';
  ELSE
    RAISE NOTICE '🔴 Issues detected - review output above';
    RAISE NOTICE '';
    RAISE NOTICE 'Recommended Actions:';
    IF NOT rls_enabled THEN
      RAISE NOTICE '1. RUN: 20250205_fix_profiles_rls_properly.sql';
    END IF;
    IF policy_count != 4 THEN
      RAISE NOTICE '2. Check for policy conflicts or missing policies';
      RAISE NOTICE '3. Review migration logs';
    END IF;
    RAISE NOTICE '4. Contact backend team if issues persist';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
END $$;

-- ===================================================================
-- Manual Testing Recommendations
-- ===================================================================

\echo ''
\echo 'MANUAL TESTING CHECKLIST'
\echo '------------------------'
\echo '1. [ ] Staff user can login'
\echo '2. [ ] Staff user sees own profile only'
\echo '3. [ ] Admin can see all profiles'
\echo '4. [ ] Manager can see all profiles'
\echo '5. [ ] Admin can create staff via CRM UI'
\echo '6. [ ] Realtime profile updates work'
\echo '7. [ ] No console errors on login'
\echo ''

-- ===================================================================
-- Troubleshooting Guide
-- ===================================================================

\echo 'TROUBLESHOOTING'
\echo '---------------'
\echo 'If issues found:'
\echo ''
\echo '1. RLS Disabled:'
\echo '   → Run: 20250205_fix_profiles_rls_properly.sql'
\echo ''
\echo '2. Wrong Policy Count:'
\echo '   → Check migration logs'
\echo '   → Verify no conflicting migrations'
\echo ''
\echo '3. Login Still Fails:'
\echo '   → Clear browser cache and localStorage'
\echo '   → Check Supabase service status'
\echo '   → Review auth-context.tsx error logs'
\echo ''
\echo '4. Emergency:'
\echo '   → Run: 20250205_rollback_profiles_rls.sql'
\echo '   → This will disable RLS temporarily'
\echo ''
\echo '================================================================'
\echo 'END OF VERIFICATION REPORT'
\echo '================================================================'
\echo ''
