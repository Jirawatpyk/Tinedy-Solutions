-- ============================================================================
-- Migration: Create get_all_team_members_with_dates RPC function
-- ============================================================================
-- Purpose: New RPC function that returns ALL team members (including former)
-- with their joined_at and left_at dates for historical filtering
--
-- Use case: Booking Details modal needs to show team members who were active
-- at the time the booking was created, not current members
--
-- NOTE: This is SEPARATE from get_team_members_by_team_id which returns
-- only ACTIVE members (for creating/editing bookings)
-- ============================================================================

-- Create new function for historical team member lookup
CREATE OR REPLACE FUNCTION get_all_team_members_with_dates(p_team_id uuid)
RETURNS TABLE (
  id uuid,
  is_active boolean,
  staff_id uuid,
  full_name text,
  joined_at timestamptz,
  left_at timestamptz
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
    p.full_name,
    tm.joined_at,
    tm.left_at
  FROM team_members tm
  LEFT JOIN profiles p ON tm.staff_id = p.id
  WHERE tm.team_id = p_team_id;
  -- No left_at filter - return ALL members (active and former)
  -- Frontend will filter based on booking.created_at for historical view
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_team_members_with_dates(uuid) TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION get_all_team_members_with_dates(uuid) IS
'Returns ALL team members (active and former) for a given team_id with their joined_at and left_at dates.
Used for Booking Details to show members who were active at booking creation time.
Frontend filters: joined_at <= booking.created_at AND (left_at IS NULL OR left_at > booking.created_at)';
