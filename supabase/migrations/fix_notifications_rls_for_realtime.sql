-- Fix notifications RLS for Realtime subscriptions
-- This enables Manager role to receive realtime notifications

-- First, check current policies
DO $$
BEGIN
  RAISE NOTICE 'Current policies on notifications table:';
END $$;

SELECT policyname, cmd FROM pg_policies WHERE tablename = 'notifications';

-- Drop ALL existing policies to start fresh
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'notifications')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON notifications', r.policyname);
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for notifications

-- 1. SELECT policy - Allow users to view their own notifications + Admin/Manager can view all
CREATE POLICY "Users can view notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- 2. INSERT policy - Allow all authenticated to insert (required for Realtime)
CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. UPDATE policy - Users can update their own, Admin/Manager can update all
CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- 4. DELETE policy - Users can delete their own, Admin/Manager can delete all
CREATE POLICY "Users can delete their notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Verify the new policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;

COMMENT ON TABLE notifications IS 'In-app notifications with RLS supporting Admin, Manager, and user-specific access';
