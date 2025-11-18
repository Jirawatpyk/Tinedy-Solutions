-- ============================================================================
-- Enable Row Level Security (RLS) Policies
-- ============================================================================
-- This migration enables RLS and creates policies for Manager role support
-- Based on the permission matrix in src/lib/permissions.ts
--
-- IMPORTANT: Run this migration in production to secure your database
-- ============================================================================

-- Enable RLS on all tables
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

-- Helper function to get user role
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

-- Profiles Table Policies
-- ============================================================================

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  get_user_role() = 'admin'
);

-- Manager can view all profiles
CREATE POLICY "Managers can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager')
);

-- Staff can view own profile
CREATE POLICY "Staff can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR get_user_role() IN ('admin', 'manager')
);

-- Only admin can create/update/delete profiles
CREATE POLICY "Only admins can insert profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role() = 'admin'
);

CREATE POLICY "Only admins can update profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  get_user_role() = 'admin'
);

CREATE POLICY "Only admins can delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (
  get_user_role() = 'admin'
);

-- Customers Table Policies
-- ============================================================================

-- Admin and Manager can view all customers
CREATE POLICY "Admins and Managers can view customers"
ON customers FOR SELECT
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager')
);

-- Admin and Manager can create customers
CREATE POLICY "Admins and Managers can create customers"
ON customers FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role() IN ('admin', 'manager')
);

-- Admin and Manager can update customers
CREATE POLICY "Admins and Managers can update customers"
ON customers FOR UPDATE
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager')
);

-- Only admin can delete customers (hard delete)
CREATE POLICY "Only admins can delete customers"
ON customers FOR DELETE
TO authenticated
USING (
  get_user_role() = 'admin'
);

-- Bookings Table Policies
-- ============================================================================

-- Admin and Manager can view all bookings
CREATE POLICY "Admins and Managers can view bookings"
ON bookings FOR SELECT
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager') OR
  assigned_staff_id = auth.uid()
);

-- Admin and Manager can create bookings
CREATE POLICY "Admins and Managers can create bookings"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role() IN ('admin', 'manager')
);

-- Admin and Manager can update bookings
CREATE POLICY "Admins and Managers can update bookings"
ON bookings FOR UPDATE
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager')
);

-- Only admin can hard delete bookings
CREATE POLICY "Only admins can delete bookings"
ON bookings FOR DELETE
TO authenticated
USING (
  get_user_role() = 'admin'
);

-- Service Packages Table Policies
-- ============================================================================

-- Everyone can view active service packages
CREATE POLICY "All authenticated users can view packages"
ON service_packages FOR SELECT
TO authenticated
USING (true);

-- Only admin can create service packages
CREATE POLICY "Only admins can create packages"
ON service_packages FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role() = 'admin'
);

-- Only admin can update service packages
CREATE POLICY "Only admins can update packages"
ON service_packages FOR UPDATE
TO authenticated
USING (
  get_user_role() = 'admin'
);

-- Only admin can delete service packages
CREATE POLICY "Only admins can delete packages"
ON service_packages FOR DELETE
TO authenticated
USING (
  get_user_role() = 'admin'
);

-- Teams Table Policies
-- ============================================================================

-- Admin and Manager can view teams
CREATE POLICY "Admins and Managers can view teams"
ON teams FOR SELECT
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager')
);

-- Admin and Manager can create teams
CREATE POLICY "Admins and Managers can create teams"
ON teams FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role() IN ('admin', 'manager')
);

-- Admin and Manager can update teams
CREATE POLICY "Admins and Managers can update teams"
ON teams FOR UPDATE
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager')
);

-- Only admin can delete teams
CREATE POLICY "Only admins can delete teams"
ON teams FOR DELETE
TO authenticated
USING (
  get_user_role() = 'admin'
);

-- Team Members Table Policies
-- ============================================================================

-- Admin and Manager can view team members
CREATE POLICY "Admins and Managers can view team members"
ON team_members FOR SELECT
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager')
);

-- Admin and Manager can add team members
CREATE POLICY "Admins and Managers can add team members"
ON team_members FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role() IN ('admin', 'manager')
);

-- Admin and Manager can update team members
CREATE POLICY "Admins and Managers can update team members"
ON team_members FOR UPDATE
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager')
);

-- Admin and Manager can remove team members
CREATE POLICY "Admins and Managers can remove team members"
ON team_members FOR DELETE
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager')
);

-- Messages Table Policies
-- ============================================================================

-- Users can view messages they sent or received
CREATE POLICY "Users can view their messages"
ON messages FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid() OR
  recipient_id = auth.uid() OR
  get_user_role() = 'admin'
);

-- Users can send messages
CREATE POLICY "Users can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
);

-- Only admin can delete messages
CREATE POLICY "Only admins can delete messages"
ON messages FOR DELETE
TO authenticated
USING (
  get_user_role() = 'admin'
);

-- Notifications Table Policies
-- ============================================================================

-- Users can view their own notifications
CREATE POLICY "Users can view their notifications"
ON notifications FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  get_user_role() = 'admin'
);

-- System can create notifications
CREATE POLICY "Authenticated users can create notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can update their own notifications
CREATE POLICY "Users can update their notifications"
ON notifications FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  get_user_role() = 'admin'
);

-- Reviews Table Policies
-- ============================================================================

-- Everyone can view reviews
CREATE POLICY "All authenticated users can view reviews"
ON reviews FOR SELECT
TO authenticated
USING (true);

-- Admin and Manager can create reviews
CREATE POLICY "Admins and Managers can create reviews"
ON reviews FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role() IN ('admin', 'manager')
);

-- Only admin can delete reviews
CREATE POLICY "Only admins can delete reviews"
ON reviews FOR DELETE
TO authenticated
USING (
  get_user_role() = 'admin'
);

-- ============================================================================
-- Additional Security Views (Optional)
-- ============================================================================

-- View for checking if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for checking if user is manager or admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() IN ('admin', 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant necessary permissions
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================================
-- End of Migration
-- ============================================================================

-- Verify RLS is enabled
DO $$
DECLARE
  table_name TEXT;
  rls_enabled BOOLEAN;
BEGIN
  FOR table_name IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'profiles', 'customers', 'bookings', 'service_packages',
      'teams', 'team_members', 'messages', 'notifications', 'reviews'
    )
  LOOP
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = table_name;

    IF rls_enabled THEN
      RAISE NOTICE 'RLS enabled on table: %', table_name;
    ELSE
      RAISE WARNING 'RLS NOT enabled on table: %', table_name;
    END IF;
  END LOOP;
END $$;
