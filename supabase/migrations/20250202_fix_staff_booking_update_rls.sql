-- Fix Staff Booking Update RLS Policies
-- Issue: Staff cannot update booking status due to conflicting policies
-- Date: 2025-02-02

-- ===================================================================
-- Problem Analysis:
-- ===================================================================
-- Two conflicting UPDATE policies exist:
-- 1. "Admins and Managers can update bookings" (from enable_rls_policies_v2.sql)
--    - Missing WITH CHECK clause
--    - Uses get_user_role() function which may cause issues
-- 2. "Staff can update assigned bookings" (from 20250116_manager_rls_policies.sql)
--    - Has both USING and WITH CHECK
--    - But conflicts with admin policy
--
-- Result: Staff users are blocked from updating bookings
--
-- Solution: Drop old policies and create new simplified ones

-- ===================================================================
-- Step 1: Drop conflicting policies
-- ===================================================================

DROP POLICY IF EXISTS "Admins and Managers can update bookings" ON bookings;
DROP POLICY IF EXISTS "Staff can update assigned bookings" ON bookings;

-- ===================================================================
-- Step 2: Create new simplified policies
-- ===================================================================

-- Policy 1: Admin and Manager can update ALL bookings
CREATE POLICY "Admins and Managers can update all bookings"
ON bookings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy 2: Staff can update ASSIGNED bookings only
CREATE POLICY "Staff can update their assigned bookings"
ON bookings FOR UPDATE
TO authenticated
USING (
  -- Check if user is staff (not admin/manager)
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'staff'
  )
  AND (
    -- Assigned directly to staff
    staff_id = auth.uid()
    OR
    -- Assigned to team that staff belongs to
    team_id IN (
      SELECT team_id FROM team_members
      WHERE staff_id = auth.uid()
      AND is_active = true
    )
  )
)
WITH CHECK (
  -- Prevent changing assignment fields
  -- Only allow updating status, notes, etc.
  staff_id = (SELECT staff_id FROM bookings WHERE id = bookings.id)
  AND
  team_id IS NOT DISTINCT FROM (SELECT team_id FROM bookings WHERE id = bookings.id)
);

-- ===================================================================
-- Step 3: Verify new policies
-- ===================================================================

-- Query to check policies (for manual verification in Supabase Dashboard):
-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE tablename = 'bookings'
-- AND cmd = 'UPDATE'
-- ORDER BY policyname;

-- ===================================================================
-- Comments for documentation
-- ===================================================================

COMMENT ON POLICY "Admins and Managers can update all bookings" ON bookings IS
  'Allows admin and manager roles to update any booking without restrictions';

COMMENT ON POLICY "Staff can update their assigned bookings" ON bookings IS
  'Allows staff to update bookings assigned to them (staff_id) or their team (team_id), but prevents changing assignment fields';
