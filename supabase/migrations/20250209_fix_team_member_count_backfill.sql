-- ============================================================================
-- Migration: Fix team_member_count backfill to count only ACTIVE members
-- ============================================================================
-- Purpose: Re-backfill team_member_count to count only active members (left_at IS NULL)
--
-- Problem: Previous backfill counted is_active = true but didn't filter left_at IS NULL
-- This caused bookings to have incorrect member counts after soft delete was implemented
--
-- Solution: Re-calculate team_member_count for existing bookings using left_at filter
-- ============================================================================

-- Update team_member_count for all team bookings
-- Only count members who haven't left (left_at IS NULL)
UPDATE bookings b
SET team_member_count = (
  SELECT COALESCE(COUNT(*)::INTEGER, 1)
  FROM team_members tm
  WHERE tm.team_id = b.team_id
    AND tm.is_active = true
    AND tm.left_at IS NULL  -- Only count ACTIVE members (not soft-deleted)
)
WHERE b.team_id IS NOT NULL
  AND b.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = b.team_id AND t.is_active = true
  );

-- Ensure minimum value of 1 to prevent division by zero
UPDATE bookings
SET team_member_count = 1
WHERE team_id IS NOT NULL
  AND (team_member_count IS NULL OR team_member_count < 1)
  AND deleted_at IS NULL;

-- Add comment explaining the fix
COMMENT ON COLUMN bookings.team_member_count IS
  'Number of ACTIVE team members at booking creation time. Uses left_at IS NULL filter. Used for earnings calculation. NULL for individual (staff) bookings.';
