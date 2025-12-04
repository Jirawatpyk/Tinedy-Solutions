-- ============================================================================
-- Add team_member_count to Bookings
-- ============================================================================
-- Purpose: Store the number of active team members at booking creation time
-- This ensures accurate earnings calculation even when team membership changes
--
-- Problem: Previously, earnings were divided by CURRENT team member count
-- which was incorrect when members joined/left the team after booking was made
--
-- Solution: Store the count at creation time and use that for calculations
-- ============================================================================

-- Add team_member_count column
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS team_member_count INTEGER DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN bookings.team_member_count IS
  'Number of active team members at booking creation time. Used for earnings calculation. NULL for individual (staff) bookings.';

-- Optional: Backfill existing team bookings with current member count
-- This provides a reasonable default for historical data
-- Only backfill for active teams (inactive teams shouldn't have bookings recalculated)
UPDATE bookings b
SET team_member_count = (
  SELECT COUNT(*)::INTEGER
  FROM team_members tm
  WHERE tm.team_id = b.team_id AND tm.is_active = true
)
WHERE b.team_id IS NOT NULL
  AND b.team_member_count IS NULL
  AND b.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = b.team_id AND t.is_active = true
  );
