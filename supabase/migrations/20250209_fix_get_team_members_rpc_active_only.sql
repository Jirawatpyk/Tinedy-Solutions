-- ============================================================================
-- Migration: Fix get_team_members_by_team_id to return only ACTIVE members
-- ============================================================================
-- Purpose: Update RPC function to filter by left_at IS NULL (active members only)
-- This ensures proper revenue calculation when creating bookings
--
-- Problem: The old function returned ALL members including soft-deleted ones
-- Solution: Add WHERE left_at IS NULL filter
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_team_members_by_team_id(uuid);

-- Create updated function that returns only ACTIVE members
CREATE OR REPLACE FUNCTION get_team_members_by_team_id(p_team_id uuid)
RETURNS TABLE (
  id uuid,
  is_active boolean,
  staff_id uuid,
  full_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Security: Prevent privilege escalation
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tm.id,
    tm.is_active,
    tm.staff_id,
    p.full_name
  FROM team_members tm
  LEFT JOIN profiles p ON tm.staff_id = p.id
  WHERE tm.team_id = p_team_id
    AND tm.left_at IS NULL;  -- Only return active members (not soft-deleted)
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_team_members_by_team_id(uuid) TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION get_team_members_by_team_id(uuid) IS
'Returns all ACTIVE team members for a given team_id. Excludes members who have left (left_at IS NOT NULL). Used for revenue calculation when creating/editing bookings.';
