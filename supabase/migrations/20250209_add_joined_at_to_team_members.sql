-- Migration: Add joined_at column to team_members table
-- Purpose: Track when a staff member joined a team
-- This allows filtering bookings to only show those created AFTER the staff joined the team
--
-- Problem solved:
-- - When a new staff joins a team, they should NOT see/earn from old bookings
-- - Old bookings should use team_member_count stored at booking creation time
-- - New staff should only see bookings created after their join date

-- Add joined_at column with default to current timestamp
ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Backfill existing team members with their created_at date
-- If created_at doesn't exist, use a date far in the past (to include all old bookings)
UPDATE team_members
SET joined_at = COALESCE(created_at, '2024-01-01'::timestamp)
WHERE joined_at IS NULL OR joined_at = now();

-- Add index for performance when filtering bookings by joined_at
CREATE INDEX IF NOT EXISTS idx_team_members_joined_at
ON team_members(staff_id, team_id, joined_at);

-- Add comment to explain the column
COMMENT ON COLUMN team_members.joined_at IS 'When the staff member joined this team. Used to filter which bookings they can see/earn from.';

-- Verification query (run manually to check)
-- SELECT tm.staff_id, p.full_name, t.name as team_name, tm.joined_at
-- FROM team_members tm
-- JOIN profiles p ON tm.staff_id = p.id
-- JOIN teams t ON tm.team_id = t.id
-- ORDER BY t.name, tm.joined_at;
