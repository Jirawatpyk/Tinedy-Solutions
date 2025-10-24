-- Fix RLS policies for booking_status_history to support team bookings
-- Staff should be able to view and insert history for both:
-- 1. Their own staff bookings (staff_id matches)
-- 2. Team bookings where they are a team member (team_id matches)

-- Drop existing staff policies
DROP POLICY IF EXISTS "Staff can view their booking status history" ON booking_status_history;
DROP POLICY IF EXISTS "Staff can insert their booking status history" ON booking_status_history;

-- Create new policy for viewing history (supports both staff and team bookings)
CREATE POLICY "Staff can view their booking status history"
  ON booking_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_status_history.booking_id
      AND (
        -- Staff's own bookings
        bookings.staff_id = auth.uid()
        OR
        -- Team bookings where staff is a member
        bookings.team_id IN (
          SELECT team_id FROM team_members WHERE staff_id = auth.uid()
        )
      )
    )
  );

-- Create new policy for inserting history (supports both staff and team bookings)
CREATE POLICY "Staff can insert their booking status history"
  ON booking_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_status_history.booking_id
      AND (
        -- Staff's own bookings
        bookings.staff_id = auth.uid()
        OR
        -- Team bookings where staff is a member
        bookings.team_id IN (
          SELECT team_id FROM team_members WHERE staff_id = auth.uid()
        )
      )
    )
  );

-- Add comment
COMMENT ON POLICY "Staff can view their booking status history" ON booking_status_history IS
  'Allows staff to view booking status history for both their individual bookings and team bookings where they are members';

COMMENT ON POLICY "Staff can insert their booking status history" ON booking_status_history IS
  'Allows staff to insert booking status history for both their individual bookings and team bookings where they are members';
