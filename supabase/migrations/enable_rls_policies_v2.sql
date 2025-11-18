-- ============================================================================
-- Enable Row Level Security (RLS) Policies - Version 2
-- ============================================================================
-- This migration enables RLS and creates policies for Manager role support
-- Based on the permission matrix in src/lib/permissions.ts
--
-- IMPORTANT: Run this migration in production to secure your database
-- This version drops existing policies first to avoid conflicts
-- ============================================================================

-- Step 1: Drop all existing policies (if they exist)
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all existing policies on our tables
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN (
            'profiles', 'customers', 'bookings', 'service_packages',
            'teams', 'team_members', 'messages', 'notifications', 'reviews'
        )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Step 2: Enable RLS on all tables
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Step 3: Create helper functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role
    FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() IN ('admin', 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create Profiles Table Policies
-- ============================================================================

-- SELECT policies for profiles
CREATE POLICY "Admins and Managers can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager') OR id = auth.uid()
);

-- INSERT policies for profiles
CREATE POLICY "Only admins can create profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role() = 'admin'
);

-- UPDATE policies for profiles
CREATE POLICY "Admins can update all profiles, users can update own"
ON profiles FOR UPDATE
TO authenticated
USING (
  get_user_role() = 'admin' OR id = auth.uid()
);

-- DELETE policies for profiles
CREATE POLICY "Only admins can delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (
  get_user_role() = 'admin'
);

-- Step 5: Create Customers Table Policies
-- ============================================================================

CREATE POLICY "Admins and Managers can view customers"
ON customers FOR SELECT
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "Admins and Managers can create customers"
ON customers FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "Admins and Managers can update customers"
ON customers FOR UPDATE
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "Only admins can delete customers"
ON customers FOR DELETE
TO authenticated
USING (
  get_user_role() = 'admin'
);

-- Step 6: Create Bookings Table Policies
-- ============================================================================

CREATE POLICY "Users can view relevant bookings"
ON bookings FOR SELECT
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager') OR
  staff_id = auth.uid() OR
  team_id IN (
    SELECT team_id FROM team_members WHERE staff_id = auth.uid()
  )
);

CREATE POLICY "Admins and Managers can create bookings"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "Admins and Managers can update bookings"
ON bookings FOR UPDATE
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "Only admins can hard delete bookings"
ON bookings FOR DELETE
TO authenticated
USING (
  get_user_role() = 'admin'
);

-- Step 7: Create Service Packages Table Policies
-- ============================================================================

CREATE POLICY "All authenticated users can view packages"
ON service_packages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can create packages"
ON service_packages FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role() = 'admin'
);

CREATE POLICY "Only admins can update packages"
ON service_packages FOR UPDATE
TO authenticated
USING (
  get_user_role() = 'admin'
);

CREATE POLICY "Only admins can delete packages"
ON service_packages FOR DELETE
TO authenticated
USING (
  get_user_role() = 'admin'
);

-- Step 8: Create Teams Table Policies
-- ============================================================================

CREATE POLICY "Admins and Managers can view teams"
ON teams FOR SELECT
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager') OR
  id IN (SELECT team_id FROM team_members WHERE staff_id = auth.uid())
);

CREATE POLICY "Admins and Managers can create teams"
ON teams FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "Admins and Managers can update teams"
ON teams FOR UPDATE
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "Only admins can delete teams"
ON teams FOR DELETE
TO authenticated
USING (
  get_user_role() = 'admin'
);

-- Step 9: Create Team Members Table Policies
-- ============================================================================

CREATE POLICY "Users can view relevant team members"
ON team_members FOR SELECT
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager') OR
  staff_id = auth.uid()
);

CREATE POLICY "Admins and Managers can add team members"
ON team_members FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "Admins and Managers can update team members"
ON team_members FOR UPDATE
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "Admins and Managers can remove team members"
ON team_members FOR DELETE
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager')
);

-- Step 10: Create Messages Table Policies
-- ============================================================================

CREATE POLICY "Users can view their messages"
ON messages FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid() OR
  recipient_id = auth.uid() OR
  get_user_role() = 'admin'
);

CREATE POLICY "Users can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
);

CREATE POLICY "Users can update their own messages"
ON messages FOR UPDATE
TO authenticated
USING (
  sender_id = auth.uid() OR get_user_role() = 'admin'
);

CREATE POLICY "Only admins can delete messages"
ON messages FOR DELETE
TO authenticated
USING (
  get_user_role() = 'admin'
);

-- Step 11: Create Notifications Table Policies
-- ============================================================================

CREATE POLICY "Users can view their notifications"
ON notifications FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR get_user_role() = 'admin'
);

CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their notifications"
ON notifications FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR get_user_role() = 'admin'
);

CREATE POLICY "Users can delete their notifications"
ON notifications FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR get_user_role() = 'admin'
);

-- Step 12: Create Reviews Table Policies
-- ============================================================================

CREATE POLICY "All authenticated users can view reviews"
ON reviews FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and Managers can create reviews"
ON reviews FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "Admins and Managers can update reviews"
ON reviews FOR UPDATE
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "Only admins can delete reviews"
ON reviews FOR DELETE
TO authenticated
USING (
  get_user_role() = 'admin'
);

-- Step 13: Grant necessary permissions
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Step 14: Verify RLS is enabled
-- ============================================================================

DO $$
DECLARE
  table_name TEXT;
  rls_enabled BOOLEAN;
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS Verification Report';
  RAISE NOTICE '========================================';

  FOR table_name IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'profiles', 'customers', 'bookings', 'service_packages',
      'teams', 'team_members', 'messages', 'notifications', 'reviews'
    )
    ORDER BY tablename
  LOOP
    -- Check if RLS is enabled
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = table_name;

    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = table_name;

    IF rls_enabled THEN
      RAISE NOTICE '✅ % - RLS Enabled - % policies', table_name, policy_count;
    ELSE
      RAISE WARNING '❌ % - RLS NOT enabled', table_name;
    END IF;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '========================================';
END $$;
