# 🎯 Manager Role Implementation Plan

## 📋 Overview
แผนการเพิ่ม Manager role เข้าสู่ระบบ Tinedy CRM พร้อมระบบ Permission-based access control

**วันที่สร้าง:** 2025-01-16
**ผู้รับผิดชอบ:** Development Team
**ระยะเวลาโดยประมาณ:** 3-5 วัน

---

## 🏗️ Role Hierarchy

```
┌─────────────────────────────────────────┐
│            ADMIN (Super User)           │
│  • Full CRUD + Delete                   │
│  • System Settings                      │
│  • User Management                      │
│  • Financial Reports                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│        MANAGER (Operations)             │
│  • CRUD (no hard delete)                │
│  • Soft delete (cancel/archive)         │
│  • Team & Booking Management            │
│  • Reports & Analytics                  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│             STAFF (Employee)            │
│  • View own data                        │
│  • Update own profile                   │
│  • Chat system                          │
└─────────────────────────────────────────┘
```

---

## 📊 Permission Matrix

| Resource           | Admin | Manager | Staff |
|-------------------|-------|---------|-------|
| **Bookings**      |       |         |       |
| - Create          | ✅    | ✅      | ❌    |
| - Read All        | ✅    | ✅      | ❌    |
| - Read Assigned   | ✅    | ✅      | ✅    |
| - Update          | ✅    | ✅      | ⚠️ (own) |
| - Delete          | ✅    | ❌      | ❌    |
| - Cancel/Archive  | ✅    | ✅      | ❌    |
| **Customers**     |       |         |       |
| - Create          | ✅    | ✅      | ❌    |
| - Read            | ✅    | ✅      | ⚠️ (assigned) |
| - Update          | ✅    | ✅      | ❌    |
| - Delete          | ✅    | ❌      | ❌    |
| **Staff**         |       |         |       |
| - Create          | ✅    | ❌      | ❌    |
| - Read            | ✅    | ✅      | ⚠️ (self) |
| - Update          | ✅    | ⚠️ (assignments) | ⚠️ (self) |
| - Delete          | ✅    | ❌      | ❌    |
| **Teams**         |       |         |       |
| - Create          | ✅    | ✅      | ❌    |
| - Read            | ✅    | ✅      | ⚠️ (assigned) |
| - Update          | ✅    | ✅      | ❌    |
| - Delete          | ✅    | ❌      | ❌    |
| **Reports**       |       |         |       |
| - View            | ✅    | ✅      | ❌    |
| - Export          | ✅    | ✅      | ❌    |
| **Settings**      |       |         |       |
| - View            | ✅    | ❌      | ❌    |
| - Update          | ✅    | ❌      | ❌    |
| **User Mgmt**     |       |         |       |
| - Create User     | ✅    | ❌      | ❌    |
| - Assign Roles    | ✅    | ❌      | ❌    |
| - Delete User     | ✅    | ❌      | ❌    |

**Legend:**
- ✅ = Full Access
- ❌ = No Access
- ⚠️ = Limited/Conditional Access

---

## 🗂️ Phase-by-Phase Implementation

### **PHASE 1: Database & Schema** 🗄️
**Priority:** 🔴 Critical
**Estimated Time:** 4-6 hours

#### Files to Modify/Create:

1. ✅ **Database Migration**
   - [ ] `supabase/migrations/20250116_add_manager_role.sql`
     - Update profiles role constraint
     - Add manager to CHECK constraint
     - Create role_permissions table (optional)
     - Migrate existing data (if needed)

2. ✅ **RLS Policies**
   - [ ] `supabase/migrations/20250116_manager_rls_policies.sql`
     - Bookings policies (manager can CRUD except DELETE)
     - Customers policies (manager can CRUD except DELETE)
     - Staff policies (manager can READ, limited UPDATE)
     - Teams policies (manager can CRUD except DELETE)
     - Reports access policies
     - Settings policies (admin only)

3. ✅ **Soft Delete System**
   - [ ] `supabase/migrations/20250116_soft_delete_system.sql`
     - Add `deleted_at` column to critical tables
     - Add `deleted_by` column for audit trail
     - Create restore functions
     - Update existing queries to filter deleted records

---

### **PHASE 2: Type System** 📝
**Priority:** 🔴 Critical
**Estimated Time:** 2-3 hours

#### Files to Modify:

1. ✅ **Core Types**
   - [ ] `src/types/common.ts`
     ```typescript
     // Line 24-28: Update UserRole enum
     export const UserRole = {
       Admin: 'admin',
       Manager: 'manager',  // ← ADD
       Staff: 'staff',
       Customer: 'customer'
     } as const
     ```
     - Add Permission interface
     - Add PermissionMap type
     - Add hasPermission utility type

2. ✅ **Auth Types**
   - [ ] `src/contexts/auth-context.tsx`
     ```typescript
     // Line 10: Update role type
     role: 'admin' | 'manager' | 'staff'  // ← ADD manager
     ```

3. ✅ **Protected Route Types**
   - [ ] `src/components/auth/protected-route.tsx`
     ```typescript
     // Line 6: Update allowedRoles type
     allowedRoles?: ('admin' | 'manager' | 'staff')[]  // ← ADD manager
     ```

4. ✅ **Database Types**
   - [ ] `src/types/database.types.ts`
     - Regenerate with Supabase CLI after migration
     ```bash
     npx supabase gen types typescript --project-id [PROJECT_ID] > src/types/database.types.ts
     ```

---

### **PHASE 3: Permission System** 🔐
**Priority:** 🔴 Critical
**Estimated Time:** 4-6 hours

#### Files to Create:

1. ✅ **Permission Hook**
   - [ ] `src/hooks/use-permissions.ts` (NEW FILE)
     ```typescript
     // Complete permission checking system
     - usePermissions() hook
     - can(action, resource) function
     - canDelete(resource) function
     - canAccess(route) function
     - Permission constants
     ```

2. ✅ **Permission Context** (Optional - for better performance)
   - [ ] `src/contexts/permission-context.tsx` (NEW FILE)
     ```typescript
     // Centralized permission state
     - PermissionProvider
     - usePermissionContext()
     - Permission caching
     ```

3. ✅ **Permission Utilities**
   - [ ] `src/lib/permissions.ts` (NEW FILE)
     ```typescript
     // Permission helper functions
     - checkPermission(role, action, resource)
     - getPermissionsForRole(role)
     - PERMISSION_MATRIX constant
     ```

#### Files to Modify:

4. ✅ **Auth Context**
   - [ ] `src/contexts/auth-context.tsx`
     - Add permission checking to context
     - Export usePermissions hook

---

### **PHASE 4: Routing & Navigation** 🧭
**Priority:** 🟡 High
**Estimated Time:** 3-4 hours

#### Files to Modify:

1. ✅ **App Router**
   - [ ] `src/App.tsx`
     ```typescript
     // Add Manager routes (lines 90-110)
     <Route
       path="/manager"
       element={
         <ProtectedRoute allowedRoles={['admin', 'manager']}>
           <MainLayout />
         </ProtectedRoute>
       }
     >
       {/* Manager-specific pages */}
     </Route>
     ```

2. ✅ **Role-Based Redirect**
   - [ ] `src/components/auth/role-based-redirect.tsx`
     ```typescript
     // Add manager redirect (after line 42)
     } else if (profile.role === 'manager') {
       return <Navigate to="/manager" replace />
     ```

3. ✅ **Protected Route**
   - [ ] `src/components/auth/protected-route.tsx`
     - Already updated in Phase 2

---

### **PHASE 5: UI Components** 🎨
**Priority:** 🟡 High
**Estimated Time:** 6-8 hours

#### Files to Modify:

1. ✅ **Sidebar Navigation**
   - [ ] `src/components/layout/sidebar.tsx`
     ```typescript
     // Add managerNavItems (after line 42)
     const managerNavItems = [
       { name: 'Dashboard', href: '/manager', icon: LayoutDashboard },
       { name: 'Bookings', href: '/manager/bookings', icon: ClipboardList },
       { name: 'Calendar', href: '/manager/calendar', icon: Calendar },
       { name: 'Weekly Schedule', href: '/manager/weekly-schedule', icon: Calendar },
       { name: 'Customers', href: '/manager/customers', icon: Users },
       { name: 'Staff', href: '/manager/staff', icon: UsersRound },
       { name: 'Teams', href: '/manager/teams', icon: UsersRound },
       { name: 'Chat', href: '/manager/chat', icon: MessageSquare },
       { name: 'Reports', href: '/manager/reports', icon: BarChart3 },
       { name: 'My Profile', href: '/manager/profile', icon: UserCircle },
     ]

     // Update navItems logic (line 58)
     const navItems =
       profile?.role === 'admin' ? adminNavItems :
       profile?.role === 'manager' ? managerNavItems :
       staffNavItems
     ```

2. ✅ **Header Component**
   - [ ] `src/components/layout/header.tsx`
     - Update role display badge
     - Add manager role styling

3. ✅ **Delete Buttons with Permissions**
   - [ ] `src/pages/admin/bookings.tsx`
   - [ ] `src/pages/admin/customers.tsx`
   - [ ] `src/pages/admin/staff.tsx`
   - [ ] `src/pages/admin/teams.tsx`
     ```typescript
     // Wrap delete buttons with permission check
     {can('delete', 'bookings') && (
       <Button variant="destructive" onClick={handleDelete}>
         Delete
       </Button>
     )}

     // Manager sees Cancel/Archive instead
     {profile?.role === 'manager' && (
       <Button variant="secondary" onClick={handleCancel}>
         Cancel/Archive
       </Button>
     )}
     ```

#### Files to Create:

4. ✅ **Manager Pages** (Shared with Admin)
   - [ ] `src/pages/manager/dashboard.tsx` (symlink or reuse admin)
   - [ ] `src/pages/manager/bookings.tsx` (reuse with permission checks)
   - [ ] `src/pages/manager/customers.tsx` (reuse with permission checks)
   - [ ] `src/pages/manager/staff.tsx` (reuse with permission checks)
   - [ ] `src/pages/manager/teams.tsx` (reuse with permission checks)
   - [ ] `src/pages/manager/reports.tsx` (reuse with permission checks)
   - [ ] `src/pages/manager/calendar.tsx` (reuse with permission checks)
   - [ ] `src/pages/manager/weekly-schedule.tsx` (reuse with permission checks)
   - [ ] `src/pages/manager/chat.tsx` (reuse with permission checks)
   - [ ] `src/pages/manager/profile.tsx` (reuse with permission checks)

   **Note:** แทนที่จะ duplicate code ให้ใช้วิธีนี้:
   ```typescript
   // src/pages/manager/bookings.tsx
   export { AdminBookings as ManagerBookings } from '../admin/bookings'
   ```

---

### **PHASE 6: Soft Delete Implementation** 🗑️
**Priority:** 🟢 Medium
**Estimated Time:** 4-6 hours

#### Files to Create:

1. ✅ **Soft Delete Hooks**
   - [ ] `src/hooks/use-soft-delete.ts` (NEW FILE)
     ```typescript
     // Soft delete management
     - useSoftDelete(table)
     - softDelete(id)
     - restore(id)
     - permanentDelete(id) // admin only
     ```

2. ✅ **Archive/Restore UI Components**
   - [ ] `src/components/common/ArchiveButton.tsx` (NEW FILE)
   - [ ] `src/components/common/RestoreButton.tsx` (NEW FILE)
   - [ ] `src/components/common/DeletedItemsBanner.tsx` (NEW FILE)

#### Files to Modify:

3. ✅ **Query Filters**
   - [ ] `src/hooks/use-bookings.ts`
   - [ ] `src/hooks/use-customers.ts`
   - [ ] `src/hooks/use-staff.ts`
   - [ ] `src/hooks/use-teams.ts`
     ```typescript
     // Add .is('deleted_at', null) to all queries
     const { data } = await supabase
       .from('bookings')
       .select('*')
       .is('deleted_at', null)  // ← Filter out deleted records
     ```

4. ✅ **Delete Functions**
   - Update all delete functions to soft delete
   - Add permanent delete for admins

---

### **PHASE 7: Settings & User Management** ⚙️
**Priority:** 🟢 Medium
**Estimated Time:** 3-4 hours

#### Files to Modify:

1. ✅ **Settings Page Access**
   - [ ] `src/pages/admin/settings.tsx`
     - Add permission check: only admin can access
     ```typescript
     const { can } = usePermissions()
     if (!can('read', 'settings')) {
       return <Navigate to="/unauthorized" />
     }
     ```

2. ✅ **Staff Creation Form**
   - [ ] `src/components/staff/staff-create-modal.tsx`
   - [ ] `src/pages/admin/staff.tsx`
     ```typescript
     // Add role selection dropdown
     <Select name="role">
       <option value="staff">Staff</option>
       {profile?.role === 'admin' && (
         <option value="manager">Manager</option>
       )}
     </Select>
     ```

3. ✅ **User Profile Updates**
   - [ ] `src/pages/admin/profile.tsx`
   - [ ] `src/pages/staff/profile.tsx`
     - Show role badge (read-only)
     - Prevent self-role modification

---

### **PHASE 8: Analytics & Reports** 📊
**Priority:** 🟢 Medium
**Estimated Time:** 2-3 hours

#### Files to Modify:

1. ✅ **Reports Access**
   - [ ] `src/pages/admin/reports.tsx`
     ```typescript
     // Allow both admin and manager
     <ProtectedRoute allowedRoles={['admin', 'manager']}>
     ```

2. ✅ **Financial Data Filtering**
   - [ ] `src/lib/analytics.ts`
     ```typescript
     // Filter sensitive data for managers
     export function filterFinancialData(data, role) {
       if (role === 'manager') {
         // Remove cost breakdown, profit margins
         return data.map(({ cost, profit, ...rest }) => rest)
       }
       return data
     }
     ```

3. ✅ **Export Functions**
   - [ ] `src/lib/export.ts`
     - Add role-based field filtering
     - Managers can't export sensitive fields

---

### **PHASE 9: Testing** 🧪
**Priority:** 🔴 Critical
**Estimated Time:** 6-8 hours

#### Files to Create:

1. ✅ **Permission Tests**
   - [ ] `src/hooks/__tests__/use-permissions.test.ts`
   - [ ] `src/lib/__tests__/permissions.test.ts`

2. ✅ **Integration Tests**
   - [ ] `src/__tests__/manager-role-integration.test.tsx`
     - Test manager can access allowed routes
     - Test manager blocked from admin-only routes
     - Test manager can't delete
     - Test soft delete functionality

3. ✅ **E2E Tests** (if applicable)
   - [ ] `e2e/manager-workflows.spec.ts`

#### Manual Testing Checklist:

- [ ] Manager can log in
- [ ] Manager sees correct sidebar menu
- [ ] Manager redirects to /manager on login
- [ ] Manager can create bookings
- [ ] Manager can edit bookings
- [ ] Manager CANNOT hard delete bookings
- [ ] Manager CAN cancel/archive bookings
- [ ] Manager can view all customers
- [ ] Manager can create/edit customers
- [ ] Manager CANNOT delete customers
- [ ] Manager can view staff list
- [ ] Manager CANNOT create/delete staff
- [ ] Manager CAN assign staff to bookings
- [ ] Manager can view reports
- [ ] Manager CANNOT access settings
- [ ] Manager CANNOT assign roles
- [ ] Admin still has full access
- [ ] Staff access unchanged

---

### **PHASE 10: Documentation** 📚
**Priority:** 🟢 Low
**Estimated Time:** 2-3 hours

#### Files to Create/Update:

1. ✅ **Migration Guide**
   - [ ] `MANAGER_ROLE_MIGRATION_GUIDE.md`
     - Step-by-step migration instructions
     - Rollback procedures
     - Data backup steps

2. ✅ **User Guide**
   - [ ] `USER_GUIDE_MANAGER_ROLE.md`
     - Manager capabilities
     - Permission matrix
     - Common workflows

3. ✅ **Admin Guide**
   - [ ] `ADMIN_GUIDE_USER_MANAGEMENT.md`
     - How to create manager users
     - How to change roles
     - Permission management

4. ✅ **Update Existing Docs**
   - [ ] `README.md` - Add manager role to features
   - [ ] `DEPLOYMENT.md` - Add migration steps
   - [ ] `HANDOVER.md` - Update role information

---

## 📦 File Checklist Summary

### Database (3 files)
- [ ] `supabase/migrations/20250116_add_manager_role.sql`
- [ ] `supabase/migrations/20250116_manager_rls_policies.sql`
- [ ] `supabase/migrations/20250116_soft_delete_system.sql`

### Types (4 files)
- [ ] `src/types/common.ts`
- [ ] `src/contexts/auth-context.tsx`
- [ ] `src/components/auth/protected-route.tsx`
- [ ] `src/types/database.types.ts`

### Permission System (3 new files)
- [ ] `src/hooks/use-permissions.ts`
- [ ] `src/contexts/permission-context.tsx`
- [ ] `src/lib/permissions.ts`

### Routing (3 files)
- [ ] `src/App.tsx`
- [ ] `src/components/auth/role-based-redirect.tsx`
- [ ] `src/components/auth/protected-route.tsx` (duplicate from types)

### UI Components (15+ files)
- [ ] `src/components/layout/sidebar.tsx`
- [ ] `src/components/layout/header.tsx`
- [ ] `src/pages/admin/bookings.tsx`
- [ ] `src/pages/admin/customers.tsx`
- [ ] `src/pages/admin/staff.tsx`
- [ ] `src/pages/admin/teams.tsx`
- [ ] `src/pages/manager/dashboard.tsx` (10 files - reuse admin pages)
- [ ] `src/components/common/ArchiveButton.tsx`
- [ ] `src/components/common/RestoreButton.tsx`
- [ ] `src/components/common/DeletedItemsBanner.tsx`

### Soft Delete (5+ files)
- [ ] `src/hooks/use-soft-delete.ts`
- [ ] `src/hooks/use-bookings.ts`
- [ ] `src/hooks/use-customers.ts`
- [ ] `src/hooks/use-staff.ts`
- [ ] `src/hooks/use-teams.ts`

### Settings (3 files)
- [ ] `src/pages/admin/settings.tsx`
- [ ] `src/components/staff/staff-create-modal.tsx`
- [ ] `src/pages/admin/profile.tsx`

### Analytics (3 files)
- [ ] `src/pages/admin/reports.tsx`
- [ ] `src/lib/analytics.ts`
- [ ] `src/lib/export.ts`

### Testing (3+ files)
- [ ] `src/hooks/__tests__/use-permissions.test.ts`
- [ ] `src/lib/__tests__/permissions.test.ts`
- [ ] `src/__tests__/manager-role-integration.test.tsx`

### Documentation (4 files)
- [ ] `MANAGER_ROLE_MIGRATION_GUIDE.md`
- [ ] `USER_GUIDE_MANAGER_ROLE.md`
- [ ] `ADMIN_GUIDE_USER_MANAGEMENT.md`
- [ ] Update: `README.md`, `DEPLOYMENT.md`, `HANDOVER.md`

---

## 🎯 Total Files Impact

- **New Files:** ~18 files
- **Modified Files:** ~30 files
- **Documentation:** 7 files
- **Total:** ~55 files

---

## ⚠️ Critical Considerations

### 1. **Data Migration**
- Backup production database before migration
- Test migration on staging first
- Prepare rollback scripts

### 2. **Existing Users**
- All current admin users remain admins
- All current staff users remain staff
- No automatic promotion to manager

### 3. **Backward Compatibility**
- Existing code must work during migration
- Feature flags for gradual rollout
- Fallback for permission checks

### 4. **Performance**
- Permission checks cached in context
- RLS policies optimized with indexes
- Soft delete queries use indexed `deleted_at`

### 5. **Security**
- Manager cannot escalate to admin
- Soft delete is reversible (audit trail)
- Hard delete only by admin
- All permission checks on backend (RLS)

---

## 🚀 Deployment Strategy

### Pre-Deployment
1. [ ] Code review all changes
2. [ ] Run all tests (unit, integration, E2E)
3. [ ] Backup production database
4. [ ] Test on staging environment
5. [ ] Prepare rollback plan

### Deployment Steps
1. [ ] Deploy database migrations
2. [ ] Verify RLS policies
3. [ ] Deploy application code
4. [ ] Create first manager user for testing
5. [ ] Verify manager functionality
6. [ ] Monitor logs for errors

### Post-Deployment
1. [ ] Verify all role redirects work
2. [ ] Test permission checks
3. [ ] Monitor performance metrics
4. [ ] Train users on new role
5. [ ] Update user documentation

---

## 🔄 Rollback Plan

If issues occur:

1. **Application Rollback**
   ```bash
   git revert [commit-hash]
   npm run build
   # Deploy previous version
   ```

2. **Database Rollback**
   ```sql
   -- Restore role constraint
   ALTER TABLE profiles
   DROP CONSTRAINT profiles_role_check;

   ALTER TABLE profiles
   ADD CONSTRAINT profiles_role_check
   CHECK (role IN ('admin', 'staff'));

   -- Update manager users to admin (if needed)
   UPDATE profiles
   SET role = 'admin'
   WHERE role = 'manager';
   ```

3. **Verify Rollback**
   - [ ] All users can log in
   - [ ] Original functionality restored
   - [ ] No data loss

---

## 📞 Support & Questions

For implementation questions or issues:
1. Review this document
2. Check existing code patterns
3. Consult team lead
4. Document decisions in code comments

---

## ✅ Sign-Off

| Phase | Completed | Verified By | Date |
|-------|-----------|-------------|------|
| Phase 1: Database | ⬜ | | |
| Phase 2: Types | ⬜ | | |
| Phase 3: Permissions | ⬜ | | |
| Phase 4: Routing | ⬜ | | |
| Phase 5: UI Components | ⬜ | | |
| Phase 6: Soft Delete | ⬜ | | |
| Phase 7: Settings | ⬜ | | |
| Phase 8: Analytics | ⬜ | | |
| Phase 9: Testing | ⬜ | | |
| Phase 10: Documentation | ⬜ | | |

---

**Last Updated:** 2025-01-16
**Version:** 1.0
**Status:** 📋 Planning Complete - Ready for Implementation
