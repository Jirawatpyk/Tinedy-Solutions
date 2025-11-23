-- Fix Staff Booking Update RLS Policies (Version 2 - URGENT FIX)
-- Issue: Previous migration blocked BOTH admin and staff from updating
-- Date: 2025-02-02
-- Fix: Simplify WITH CHECK clause

-- ===================================================================
-- Step 1: Drop the problematic policies from previous migration
-- ===================================================================

DROP POLICY IF EXISTS "Admins and Managers can update all bookings" ON bookings;
DROP POLICY IF EXISTS "Staff can update their assigned bookings" ON bookings;

-- ===================================================================
-- Step 2: Create new WORKING policies
-- ===================================================================

-- Policy 1: Admin and Manager can update ALL bookings (NO RESTRICTIONS)
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
  -- Admin/Manager can change anything
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy 2: Staff can update ASSIGNED bookings (SIMPLIFIED CHECK)
CREATE POLICY "Staff can update their assigned bookings"
ON bookings FOR UPDATE
TO authenticated
USING (
  -- Staff can see bookings assigned to them
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'staff'
  )
  AND (
    staff_id = auth.uid()
    OR
    team_id IN (
      SELECT team_id FROM team_members
      WHERE staff_id = auth.uid()
      AND is_active = true
    )
  )
)
WITH CHECK (
  -- Staff can update but must keep same assignment
  -- SIMPLIFIED: Just check they're still assigned
  (
    staff_id = auth.uid()
    OR
    team_id IN (
      SELECT team_id FROM team_members
      WHERE staff_id = auth.uid()
      AND is_active = true
    )
  )
);

-- ===================================================================
-- Comments
-- ===================================================================

COMMENT ON POLICY "Admins and Managers can update all bookings" ON bookings IS
  'Admin and manager can update any booking field without restrictions';

COMMENT ON POLICY "Staff can update their assigned bookings" ON bookings IS
  'Staff can update bookings assigned to them (staff_id) or their team (team_id), including status changes';
