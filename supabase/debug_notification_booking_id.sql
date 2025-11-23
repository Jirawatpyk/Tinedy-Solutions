-- Debug Script: Check Notification booking_id Issue
-- Date: 2025-02-02
-- Purpose: Investigate why notifications don't have booking_id

-- ===================================================================
-- CHECK 1: Recent Notifications - Do they have booking_id?
-- ===================================================================
SELECT
  '=== CHECK 1: Recent Notifications ===' as check_name;

SELECT
  id,
  user_id,
  type,
  title,
  LEFT(message, 60) as message_preview,
  booking_id,
  team_id,
  is_read,
  created_at
FROM notifications
WHERE type IN ('booking_updated', 'booking_cancelled', 'new_booking', 'booking_assigned')
ORDER BY created_at DESC
LIMIT 15;

-- Count notifications with/without booking_id
SELECT
  type,
  COUNT(*) FILTER (WHERE booking_id IS NOT NULL) as with_booking_id,
  COUNT(*) FILTER (WHERE booking_id IS NULL) as without_booking_id,
  COUNT(*) as total
FROM notifications
WHERE type IN ('booking_updated', 'booking_cancelled', 'new_booking', 'booking_assigned')
AND created_at > NOW() - INTERVAL '7 days'
GROUP BY type
ORDER BY type;

-- ===================================================================
-- CHECK 2: Triggers - How many are active?
-- ===================================================================
SELECT
  '=== CHECK 2: Active Triggers ===' as check_name;

SELECT
  tgname as trigger_name,
  proname as function_name,
  CASE tgenabled
    WHEN 'O' THEN 'enabled'
    WHEN 'D' THEN 'disabled'
    WHEN 'R' THEN 'replica'
    WHEN 'A' THEN 'always'
    ELSE 'unknown'
  END as status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'bookings'::regclass
AND (proname LIKE '%notify%' OR tgname LIKE '%notify%')
AND tgname NOT LIKE 'pg_%'
ORDER BY tgname;

-- ===================================================================
-- CHECK 3: Function Definition - Is it the latest version?
-- ===================================================================
SELECT
  '=== CHECK 3: Function Definition ===' as check_name;

SELECT pg_get_functiondef('public.notify_admins_booking_update()'::regprocedure) as function_definition;

-- ===================================================================
-- CHECK 4: Test Notification Creation (DRY RUN)
-- ===================================================================
SELECT
  '=== CHECK 4: What would happen if we update a booking now? ===' as check_name;

-- Show what would be inserted if we run the trigger
SELECT
  p.id as would_notify_user_id,
  p.full_name as admin_name,
  p.role,
  'Would create notification for this user' as note
FROM profiles p
WHERE p.role IN ('admin', 'manager')
ORDER BY p.role, p.full_name;

-- ===================================================================
-- RECOMMENDATIONS
-- ===================================================================
SELECT
  '=== RECOMMENDATIONS ===' as section;

SELECT
  CASE
    WHEN (SELECT COUNT(*) FROM pg_trigger WHERE tgrelid = 'bookings'::regclass AND tgname LIKE '%notify%booking%update%') > 1
    THEN '⚠️ WARNING: Multiple triggers found! Run migration to fix duplicates.'
    WHEN (SELECT COUNT(*) FILTER (WHERE booking_id IS NULL) FROM notifications WHERE type = 'booking_updated' AND created_at > NOW() - INTERVAL '1 hour') > 0
    THEN '⚠️ WARNING: Recent notifications missing booking_id! Function may not be updated.'
    ELSE '✅ OK: Triggers and notifications look good!'
  END as recommendation;
