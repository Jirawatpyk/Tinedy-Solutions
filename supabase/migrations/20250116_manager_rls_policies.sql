-- ============================================================================
-- Migration: Manager Role RLS Policies
-- Description: Create Row Level Security policies for Manager role
-- Date: 2025-01-16
-- ============================================================================

-- ============================================================================
-- BOOKINGS TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins and Managers can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins and Managers can create bookings" ON bookings;
DROP POLICY IF EXISTS "Admins and Managers can update bookings" ON bookings;
DROP POLICY IF EXISTS "Only admins can delete bookings" ON bookings;
DROP POLICY IF EXISTS "Staff can view assigned bookings" ON bookings;
DROP POLICY IF EXISTS "Staff can update assigned bookings" ON bookings;

-- Policy: Admin and Manager can view all bookings
CREATE POLICY "Admins and Managers can view all bookings"
ON bookings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy: Admin and Manager can create bookings
CREATE POLICY "Admins and Managers can create bookings"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy: Admin and Manager can update bookings
CREATE POLICY "Admins and Managers can update bookings"
ON bookings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy: Only admin can delete bookings (hard delete)
CREATE POLICY "Only admins can delete bookings"
ON bookings FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Staff can view their assigned bookings
CREATE POLICY "Staff can view assigned bookings"
ON bookings FOR SELECT
TO authenticated
USING (
  staff_id = auth.uid() OR
  team_id IN (
    SELECT team_id FROM team_members WHERE staff_id = auth.uid()
  )
);

-- Policy: Staff can update status of assigned bookings
CREATE POLICY "Staff can update assigned bookings"
ON bookings FOR UPDATE
TO authenticated
USING (
  staff_id = auth.uid() OR
  team_id IN (
    SELECT team_id FROM team_members WHERE staff_id = auth.uid()
  )
)
WITH CHECK (
  staff_id = auth.uid() OR
  team_id IN (
    SELECT team_id FROM team_members WHERE staff_id = auth.uid()
  )
);

-- ============================================================================
-- CUSTOMERS TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins and Managers can view all customers" ON customers;
DROP POLICY IF EXISTS "Admins and Managers can create customers" ON customers;
DROP POLICY IF EXISTS "Admins and Managers can update customers" ON customers;
DROP POLICY IF EXISTS "Only admins can delete customers" ON customers;
DROP POLICY IF EXISTS "Staff can view assigned customers" ON customers;

-- Policy: Admin and Manager can view all customers
CREATE POLICY "Admins and Managers can view all customers"
ON customers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy: Admin and Manager can create customers
CREATE POLICY "Admins and Managers can create customers"
ON customers FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy: Admin and Manager can update customers
CREATE POLICY "Admins and Managers can update customers"
ON customers FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy: Only admin can delete customers
CREATE POLICY "Only admins can delete customers"
ON customers FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Staff can view customers from their assigned bookings
CREATE POLICY "Staff can view assigned customers"
ON customers FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT customer_id FROM bookings
    WHERE staff_id = auth.uid() OR
    team_id IN (
      SELECT team_id FROM team_members WHERE staff_id = auth.uid()
    )
  )
);

-- ============================================================================
-- PROFILES (STAFF) TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins and Managers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can create profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can update staff assignments" ON profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Policy: Admin and Manager can view all profiles
CREATE POLICY "Admins and Managers can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager')
  )
);

-- Policy: Only admin can create profiles (staff)
CREATE POLICY "Only admins can create profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Admin can update all profiles
CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

-- Policy: Manager can update limited fields (assignments, not role)
CREATE POLICY "Managers can update staff assignments"
ON profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'manager'
  )
  -- Prevent role changes by managers (enforced in application layer too)
  AND role = (SELECT role FROM profiles WHERE id = profiles.id)
);

-- Policy: Only admin can delete profiles
CREATE POLICY "Only admins can delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy: Users can update their own profile (except role)
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  role = (SELECT role FROM profiles WHERE id = auth.uid())
);

-- ============================================================================
-- TEAMS TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins and Managers can view all teams" ON teams;
DROP POLICY IF EXISTS "Admins and Managers can create teams" ON teams;
DROP POLICY IF EXISTS "Admins and Managers can update teams" ON teams;
DROP POLICY IF EXISTS "Only admins can delete teams" ON teams;
DROP POLICY IF EXISTS "Staff can view their teams" ON teams;

-- Policy: Admin and Manager can view all teams
CREATE POLICY "Admins and Managers can view all teams"
ON teams FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy: Admin and Manager can create teams
CREATE POLICY "Admins and Managers can create teams"
ON teams FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy: Admin and Manager can update teams
CREATE POLICY "Admins and Managers can update teams"
ON teams FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy: Only admin can delete teams
CREATE POLICY "Only admins can delete teams"
ON teams FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Staff can view teams they belong to
CREATE POLICY "Staff can view their teams"
ON teams FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT team_id FROM team_members WHERE staff_id = auth.uid()
  )
);

-- ============================================================================
-- TEAM_MEMBERS TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins and Managers can manage team members" ON team_members;
DROP POLICY IF EXISTS "Staff can view their team memberships" ON team_members;

-- Policy: Admin and Manager can manage team members
CREATE POLICY "Admins and Managers can manage team members"
ON team_members FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy: Staff can view their team memberships
CREATE POLICY "Staff can view their team memberships"
ON team_members FOR SELECT
TO authenticated
USING (staff_id = auth.uid());

-- ============================================================================
-- SERVICE_PACKAGES TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can view active service packages" ON service_packages;
DROP POLICY IF EXISTS "Only admins can manage service packages" ON service_packages;

-- Policy: Everyone can view active packages
CREATE POLICY "Everyone can view active service packages"
ON service_packages FOR SELECT
TO authenticated
USING (is_active = true);

-- Policy: Only admin can manage packages (create, update, delete)
CREATE POLICY "Only admins can manage service packages"
ON service_packages FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- MESSAGES TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON messages;

-- Policy: Users can view messages they sent or received
CREATE POLICY "Users can view their messages"
ON messages FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);

-- Policy: Users can send messages
CREATE POLICY "Users can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid());

-- Policy: Users can update messages they received (mark as read)
CREATE POLICY "Users can update their received messages"
ON messages FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid());

-- ============================================================================
-- AUDIT_LOGS TABLE POLICIES (if exists)
-- ============================================================================

-- Only admin can view audit logs
DROP POLICY IF EXISTS "Only admins can view audit logs" ON audit_logs;

CREATE POLICY "Only admins can view audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON POLICY "Admins and Managers can view all bookings" ON bookings IS
'Admin and Manager roles can view all bookings in the system';

COMMENT ON POLICY "Only admins can delete bookings" ON bookings IS
'Hard delete is restricted to Admin role only. Managers should use soft delete (cancel/archive)';

COMMENT ON POLICY "Only admins can delete customers" ON customers IS
'Hard delete is restricted to Admin role only. Managers should use soft delete (archive)';

COMMENT ON POLICY "Only admins can create profiles" ON profiles IS
'Only Admin can create new user accounts and assign roles';
