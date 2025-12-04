-- ============================================================================
-- Fix Team Members RLS Policy for Staff
-- ============================================================================
-- Problem: Staff can only see their own record in team_members table
-- Solution: Allow staff to see ALL members of teams they belong to
--
-- Before: staff_id = auth.uid() (only own record)
-- After: Can see all members in teams where they are a member
-- ============================================================================

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Staff can view their team memberships" ON team_members;

-- Create new policy: Staff can view ALL members of their teams
CREATE POLICY "Staff can view their team members"
ON team_members FOR SELECT
TO authenticated
USING (
  -- Staff can see all members in teams where they are a member
  team_id IN (
    SELECT tm.team_id
    FROM team_members tm
    WHERE tm.staff_id = auth.uid()
  )
);

-- Add comment
COMMENT ON POLICY "Staff can view their team members" ON team_members IS
  'Allows staff to view all team members in teams where they are a member';
