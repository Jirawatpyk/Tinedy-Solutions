-- Fix notifications SELECT policy for Manager Realtime subscription
-- Problem: Complex SELECT policy with role check breaks Realtime for Manager
-- Solution: Simplify to allow all authenticated users to see all notifications

-- Drop all existing policies
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

-- 1. SELECT policy - Allow all authenticated users to view all notifications
--    This is required for Realtime subscriptions to work properly
CREATE POLICY "Authenticated users can view all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (true);

-- 2. INSERT policy - Allow all authenticated to insert
CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. UPDATE policy - Users can update their own notifications only
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. DELETE policy - Users can delete their own notifications only
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

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

COMMENT ON TABLE notifications IS 'In-app notifications - All authenticated users can view, users can modify their own';
