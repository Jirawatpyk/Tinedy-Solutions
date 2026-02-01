# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev        # Start development server (Vite on port 5173)
npm run build      # Type-check with tsc and build for production
npm run lint       # Run ESLint
npm run preview    # Preview production build locally
```

### Testing
Testing framework: Vitest + React Testing Library + Happy DOM

```bash
npm test              # Run tests in watch mode
npm run test:ui       # Run tests with Vitest UI
npm run test:run      # Run tests once (CI mode)
npm run test:coverage # Run tests with coverage report
```

**Test Configuration:**
- Tests located in: `src/**/__tests__/**/*.{test,spec}.{ts,tsx}`
- Setup file: `src/test/setup.ts`
- Environment: happy-dom (lightweight DOM simulation)
- Coverage target: 75% (lines, functions, branches, statements)
- Coverage reports: text, json, html, lcov

**Running Specific Tests:**
```bash
npm test -- use-staff-bookings  # Run tests matching pattern
npm test -- --run               # Run once without watch mode
```

### Build Issues
If you encounter Vite cache issues during development:
```bash
# Unix/Mac/Git Bash
rm -rf node_modules/.vite && npm run dev

# Windows PowerShell
Remove-Item -Recurse -Force node_modules\.vite; npm run dev

# Windows CMD
rmdir /s /q node_modules\.vite && npm run dev
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Shadcn UI (Radix UI primitives)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Routing**: React Router v7
- **State**: React Context (Auth) + Local State
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Calendar**: React Big Calendar
- **Icons**: Lucide React

### Currency Format
The application uses Thai Baht (?/THB) with locale `th-TH` via `formatCurrency()` in `src/lib/utils.ts`. Never use USD ($).

### Role-Based Access Control & Routing

**Three Roles with Separate Portals:**
- **Admin**: Full system access at `/admin/*` routes with all privileges
- **Manager**: Operational access at `/admin/*` routes with limited privileges (no hard delete, no settings)
- **Staff**: Limited access at `/staff/*` routes for personal work

**Role Display Names (UI vs Database):**
| Database Role | UI Display | Description |
|---------------|------------|-------------|
| `admin` | Super Admin | ผู้ดูแลระบบสูงสุด |
| `manager` | Admin | ผู้จัดการ/Admin ทั่วไป |
| `staff` | Staff | พนักงาน |

Use `formatRole()` from `src/lib/role-utils.ts` for consistent role display:
```typescript
import { formatRole, formatRoleWithIcon, getRoleBadgeVariant } from '@/lib/role-utils'

// Display role name
formatRole('admin')     // "Super Admin"
formatRole('manager')   // "Admin"

// Display with icon
formatRoleWithIcon('admin')  // "👑 Super Admin"

// Get badge variant for styling
getRoleBadgeVariant('admin')  // "destructive"
getRoleBadgeVariant('manager') // "default"
```

**Permission System:**
The application implements a comprehensive RBAC system via `src/lib/permissions.ts`:
- **Permission Matrix**: Defines granular permissions (create, read, update, delete, export) for each role and resource
- **Permission Checking**: Use `usePermissions()` hook or `hasPermission()`, `canPerformAction()` utilities
- **Protected Routes**: Use `ProtectedRoute` component with `allowedRoles` prop
- **Soft Delete**: Managers can archive (soft delete) records; only admins can permanently delete
- **157 Tests**: Comprehensive test coverage for all permission checks

**Role Capabilities:**

| Feature | Admin | Manager | Staff |
|---------|-------|---------|-------|
| Bookings (CRUD) | ✅ Full | ✅ CRU only | ❌ Read assigned only |
| Customers (CRUD) | ✅ Full | ✅ CRU only | ❌ Read only |
| Staff Management | ✅ Full | ✅ Update only | ❌ Own profile only |
| Teams | ✅ Full | ✅ CRU only | ❌ Read only |
| Reports | ✅ Full | ✅ View/Export | ❌ None |
| Settings | ✅ Full | ❌ None | ❌ None |
| Hard Delete | ✅ Yes | ❌ No | ❌ No |
| Soft Delete/Archive | ✅ Yes | ✅ Yes | ❌ No |

**Authentication:**
- Flows through `AuthContext` (`src/contexts/auth-context.tsx`)
- Manages `user` (Supabase auth) and `profile` (custom profiles table)
- Profile includes: `role`, `staff_number`, `skills`, etc.
- Permission checking via `PermissionContext` (`src/contexts/permission-context.tsx`)

**Auth Flow:**
1. User logs in → `signIn()` authenticates with Supabase
2. On success → Fetches profile from `profiles` table
3. Profile role determines permissions and route access
4. `ProtectedRoute` checks `profile.role` against `allowedRoles`
5. Permission checks throughout UI (buttons, features, actions)
6. Unauthorized users redirected to `/unauthorized` or `/login`
7. Auth state persists via Supabase session (localStorage)

**Route Structure** (defined in `src/App.tsx`):

*Admin Routes* (`/admin/*`):
- `/admin` - Dashboard
- `/admin/bookings` - Booking management
- `/admin/customers` - Customer list
- `/admin/customers/:id` - Customer detail
- `/admin/staff` - Staff management
- `/admin/staff/:id` - Staff performance
- `/admin/weekly-schedule` - Weekly schedule view
- `/admin/calendar` - Calendar view
- `/admin/chat` - Chat system
- `/admin/packages` - Service packages
- `/admin/reports` - Reports & analytics
- `/admin/teams` - Team management
- `/admin/profile` - Admin profile
- `/admin/settings` - Settings

*Staff Routes* (`/staff/*`):
- `/staff` - Dashboard
- `/staff/calendar` - Calendar view
- `/staff/chat` - Chat system
- `/staff/profile` - Staff profile

*Public Routes:*
- `/login` - Login page
- `/` - Redirects to `/admin`

### Database Architecture

**Core Tables:**
- `profiles` - User profiles (extends Supabase auth.users) with role field
- `customers` - Customer records with tags, analytics, and avatar support
- `service_packages` - Service offerings V1 (legacy system, deprecated)
- `service_packages_v2` - Service offerings V2 with tiered pricing and packages
- `bookings` - Main booking records with team/staff assignment and soft delete support
- `recurring_bookings` - Recurring booking schedules (migration exists)
- `booking_status_history` - Audit trail for booking status changes
- `teams` - Staff team organization with team leads
- `team_members` - Many-to-many team membership
- `messages` - Internal chat system with file attachments
- `notifications` - In-app notification system with realtime
- `settings` - Application settings (notifications, business hours, logo)
- `reviews` - Customer ratings for staff (may not exist in all deployments)
- `staff_availability` - Staff schedule and availability tracking

**Service Packages System:**
The application has two service package systems:
- **V1 (Legacy)**: Simple service package with fixed pricing (table: `service_packages`)
- **V2 (Current)**: Advanced system with tiered pricing and prepaid packages (table: `service_packages_v2`)
  - Supports tiered pricing (e.g., small, medium, large)
  - Prepaid package tracking with sessions/credits
  - Package usage history
  - Migration: `supabase-service-packages-v2.sql`

**Key Patterns:**
- **Row Level Security (RLS)**: All tables enforce role-based access via RLS policies
  - Admins have full access
  - Managers have read/write access (no hard delete)
  - Staff have limited access to assigned/owned records only
  - ⚠️ **CRITICAL**: RLS must be manually enabled - see `supabase/migrations/enable_rls_policies_v2.sql`
- **Soft Delete System**: Records have `deleted_at` and `deleted_by` fields for recovery
  - Managers can archive (set deleted_at) and restore (clear deleted_at)
  - Admins can hard delete (permanent removal)
  - Queries exclude soft-deleted records by default: `is('deleted_at', null)`
- **Auto-generated Fields**:
  - `staff_number` (STF0001, STF0002...) via trigger
  - Customer analytics views auto-update
- **Timestamps**: `created_at`, `updated_at` (auto-managed via triggers)
- **Payment Tracking**: Bookings have `payment_status`, `payment_method`, `payment_slip_url`
- **Team Assignment**: Bookings assigned to `staff_id` OR `team_id` (not both)

### Booking System

**Assignment Logic:**
Bookings support two assignment modes:
1. **Individual**: Assigned to specific `staff_id`
2. **Team**: Assigned to `team_id`, visible to all team members

**Critical Constraint:** A booking CANNOT be assigned to both `staff_id` AND `team_id` simultaneously. One must be NULL.

**Status Flow:**
`pending` � `confirmed` � `in_progress` � `completed`/`cancelled`

**Key Data Flows:**

1. **Booking Creation:**
   - Customer selects service package → Duration and price auto-filled
   - Admin enters start time → End time auto-calculated based on duration
   - Address defaults to customer's address but can be overridden
   - Assign to individual staff OR team (not both)

2. **Staff Viewing Their Bookings:**
   - Query includes: `staff_id.eq.userId` OR `team_id.in.(userTeamIds)`
   - Realtime subscription updates automatically via Supabase channels
   - Stats calculated in parallel: today's jobs, upcoming, completed, earnings

3. **Team Bookings:**
   - All team members see team-assigned bookings
   - Team lead designation stored in `teams.team_lead_id`
   - Team membership tracked in `team_members` junction table

**Time Format:**
- Database stores `HH:MM:SS`
- UI displays `HH:MM` - inline `formatTime()` implementation: `time.split(':').slice(0, 2).join(':')`
- Always remove seconds when displaying to users

### Performance Patterns

**Staff Bookings Hook** (`src/hooks/use-staff-bookings.ts`):
- Fetches bookings in 3 categories: today, upcoming, completed
- Calculates stats (jobs, completion rate, earnings) in **parallel** using `Promise.all()`
- Stats calculation runs in background (non-blocking)
- Uses Supabase realtime subscriptions for live updates
- Team bookings filtered with: `or(staff_id.eq.${userId},team_id.in.(${teamIds}))`

**Query Optimization:**
- Use `Promise.all()` for parallel database queries
- Use `{ count: 'exact', head: true }` for count-only queries
- Implement pagination for large datasets
- Use indexes on frequently queried columns

### UI/UX Conventions

**Mobile-First:**
All components designed mobile-first, scale up with Tailwind breakpoints:
- `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)

**Address Display:**
Always show full address format:
```typescript
[address, city, state, zip_code].filter(Boolean).join(', ')
```

**Booking Cards:**
- Card click opens detail modal
- Action buttons (Call, Maps, etc.) use `e.stopPropagation()` to prevent modal opening
- Time displayed without seconds
- Full address shown

**Dialog/Modal Behavior:**
- Radix UI Dialog components can cause scroll position jumps
- **DO NOT** attempt to fix scroll jump issues with complex workarounds
- Previous attempts failed: `preventDefault()`, `stopPropagation()`, `modal={false}`, scroll position saving
- Accept default Dialog behavior unless user explicitly requests a fix

### Utility Libraries

**Core Utilities** (`src/lib/`):
- `utils.ts` - Common helpers: `cn()` (classname merge), `formatCurrency()`, `formatDate()`, `formatDateTime()`
- `error-utils.ts` - Error handling: `getErrorMessage()`
- `analytics.ts` - Analytics and metrics calculations
- `export.ts` - Data export utilities (CSV, PDF)
- `email.ts` - Email templates and sending (via Resend)
- `notifications.ts` - Notification system utilities
- `chat-storage.ts` - Chat file storage helpers
- `tag-utils.ts` - Tag management for customers

### Supabase Integration

**Client Initialization:**
Located in `src/lib/supabase.ts` using environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Edge Functions:**
Located in `supabase/functions/`:
- `create-staff` - Creates staff users with proper auth and profile setup
- `delete-user` - Deletes user from `auth.users` and `profiles` (requires Admin role)
- `send-booking-reminder` - Sends booking reminder notifications
- Call via: `supabase.functions.invoke('function-name', { body: {...} })`

**Delete User Edge Function:**
```typescript
// Admin only - permanently delete user
const { error } = await supabase.functions.invoke('delete-user', {
  body: { userId: 'user-uuid-here' }
})
```
⚠️ **Important:** This permanently deletes the user. Use soft delete (`deleted_at`) for normal cases.

**Realtime Subscriptions:**
```typescript
const channel = supabase
  .channel('channel-name')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'table_name' }, callback)
  .subscribe()

// Cleanup
return () => supabase.removeChannel(channel)
```

**⚠️ Realtime Subscription Pitfall - Stale Closures:**
When using realtime subscriptions with React state, **always use `useRef`** for values needed in callbacks:
```typescript
// ❌ Wrong - callback captures stale selectedUser
useEffect(() => {
  const channel = supabase.channel('messages')
    .on('postgres_changes', { event: 'INSERT', table: 'messages' }, (payload) => {
      if (payload.new.sender_id === selectedUser.id) { // Stale!
        setMessages(prev => [...prev, payload.new])
      }
    })
}, [selectedUser]) // Re-creates subscription on every change

// ✅ Correct - use ref to get latest value
const selectedUserRef = useRef(selectedUser)
useEffect(() => {
  selectedUserRef.current = selectedUser
}, [selectedUser])

useEffect(() => {
  const channel = supabase.channel('messages')
    .on('postgres_changes', { event: 'INSERT', table: 'messages' }, (payload) => {
      const currentUser = selectedUserRef.current // Always current!
      if (payload.new.sender_id === currentUser.id) {
        setMessages(prev => [...prev, payload.new])
      }
    })
    .subscribe()
  return () => supabase.removeChannel(channel)
}, []) // Subscribe once
```

**Error Handling:**
- Reviews table may not exist in all deployments - wrap in try-catch
- Use `getErrorMessage()` utility from `src/lib/error-utils.ts`
- Display errors via toast notifications

### Design System

**Colors (Tailwind config):**
- `tinedy-blue`: #2e4057 (primary brand)
- `tinedy-green`: #8fb996 (success/secondary)
- `tinedy-yellow`: #e7d188 (accents/warnings)
- `tinedy-off-white`: #f5f3ee (backgrounds)
- `tinedy-dark`: #2d241d (text)

**Typography:**
- Sans (Body): Poppins
- Display (Headings): Raleway
- Rule (Labels): Sarabun

**Component Library:**
- Use Shadcn UI components from `src/components/ui/`
- Built on Radix UI primitives
- Customize via `className` prop with Tailwind

### Database Migrations

Migration files in `supabase/migrations/` are manually run in Supabase Dashboard SQL Editor.

**Migration Workflow:**
1. Open Supabase Dashboard → SQL Editor
2. Load migration file content
3. Execute SQL
4. Verify changes in Table Editor
5. Test RLS policies if applicable

**Critical Migrations (Run in Order):**
- `supabase-schema.sql` - ⚠️ **REQUIRED** Base schema (profiles, customers, bookings, teams, etc.)
- `20250116_add_manager_role.sql` - Adds manager role to user roles enum
- `20250116_soft_delete_system.sql` - Soft delete infrastructure (deleted_at, deleted_by)
- `20250116_manager_rls_policies.sql` - Manager-specific RLS policies
- `20250117_fix_profiles_rls_policies.sql` - Fixed profiles RLS policies
- `20250118_add_rls_remaining_tables.sql` - RLS for remaining tables
- `20250118_fix_delete_user_rls.sql` - Fixed user deletion RLS

**Feature Migrations:**
- `20250112_add_recurring_bookings.sql` - Recurring booking schedules
- `20250120_fix_deleted_by_foreign_keys.sql` - ⭐ Fix FK constraints for user deletion (SET NULL on delete)
- `20250121_create_booking_status_history.sql` - Audit trail for booking status changes
- `20250121_add_payment_fields.sql` - Payment tracking fields
- `20250121_add_customer_avatar.sql` - Customer avatar support
- `20250122_add_staff_number_and_skills.sql` - Staff number auto-generation and skills
- `20250118_add_business_logo_support.sql` - Business logo in settings
- `supabase-service-packages-v2.sql` - Service Packages V2 with tiered pricing

**Notification System:**
- `20250116_fix_notification_realtime.sql` - Enable realtime for notifications
- `20250116_fix_notification_language_to_english.sql` - English notification messages

**Migration Pattern:**

```sql
-- Add columns
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name TYPE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column_name);

-- Create/update trigger
CREATE OR REPLACE FUNCTION function_name() ...
CREATE TRIGGER trigger_name BEFORE INSERT ON table_name ...

-- Migrate existing data
DO $$ ... $$;
```

### Code Style

**Import Aliases:**
- Use `@/` for absolute imports (e.g., `import { supabase } from '@/lib/supabase'`)
- Configured in `vite.config.ts` as alias to `./src`

**Component Patterns:**
- Functional components with hooks
- TypeScript interfaces for all props/data
- Extract reusable logic to custom hooks (`src/hooks/`)
- Use `useCallback` for functions passed to dependencies

**Component Organization:**
- `src/components/ui/` - Shadcn UI primitives (Button, Dialog, Input, etc.)
- `src/components/auth/` - Authentication components (ProtectedRoute, etc.)
- `src/components/layout/` - Layout components (MainLayout, Sidebar, Header)
- `src/components/booking/` - Booking-related components
- `src/components/calendar/` - Calendar view components
- `src/components/customers/` - Customer-related components
- `src/components/dashboard/` - Dashboard components (stats cards, charts)
- `src/components/schedule/` - Weekly schedule components
- `src/components/staff/` - Staff-related components
- `src/components/service-packages/` - Service package components
- `src/components/reports/` - Reports and analytics components
- `src/components/payment/` - Payment-related components
- `src/components/chat/` - Chat system components
- `src/components/notifications/` - Notification components
- `src/components/charts/` - Reusable chart components
- `src/components/common/` - Shared components (ConfirmDialog, EmptyState, StatCard, StatusBadge)
- `src/components/error/` - Error handling components

**State Management:**
- Global auth state via Context
- Feature state via custom hooks (e.g., `useStaffBookings`)
- Local component state for UI-only concerns

**Custom Hooks** (`src/hooks/`):

*Permission & Auth:*
- `use-permissions.ts` - ⭐ **Permission checking hook** (hasPermission, canPerformAction, canDelete, etc.)
- `use-staff-profile.ts` - Staff profile management
- `use-admin-profile.ts` - Admin profile management

*Booking Management:*
- `use-staff-bookings.ts` - Staff booking data with realtime updates
- `use-staff-calendar.ts` - Calendar view for staff
- `useBookingForm.ts` - Booking form state and validation
- `useBookingFilters.ts` - Booking filtering logic
- `useBookingPagination.ts` - Pagination for booking lists
- `useBookingStatusManager.tsx` - Booking status updates
- `useBulkActions.ts` - Bulk operations on bookings
- `useConflictDetection.ts` - Booking conflict detection
- `use-staff-availability-check.ts` - Staff availability validation

*Communication & Notifications:*
- `use-chat.ts` - Chat functionality with realtime
- `use-notifications.ts` - Notification system
- `use-in-app-notifications.ts` - In-app notification UI

*Dashboard & Analytics:*
- `useDashboardData.ts` - Dashboard data aggregation
- `dashboard/useDashboardStats.ts` - Dashboard statistics
- `dashboard/useDashboardCharts.ts` - Chart data processing
- `useChartAnimation.ts` - Chart animation utilities

*Settings & Utilities:*
- `use-settings.ts` - Application settings management
- `use-toast.ts` - Toast notification hook
- `use-debounce.ts` - Debounce utility hook
- `use-error-handler.ts` - Error handling utilities
- `chat/useChatMessages.ts` - Chat messaging functionality

**Error Boundaries:**
- Try-catch blocks for async operations
- Toast notifications for user-facing errors
- Console errors for debugging

**TypeScript:**
- Strict mode enabled
- No implicit any (`@typescript-eslint/no-explicit-any` set to warn)
- Proper typing for Supabase queries
- Use `any` with type assertions only when necessary

**Linting:**
- ESLint with flat config format (`eslint.config.js`)
- Unused vars with underscore prefix ignored (e.g., `_event`)
- React hooks exhaustive-deps set to warn
- Run `npm run lint` before committing

### Common Pitfalls

1. **Supabase Promise Types**: Supabase queries return `PromiseLike`, not `Promise`. Use `async/await` instead of `.catch()`:
   ```typescript
   // L Wrong
   supabase.from('table').select().then().catch()

   //  Correct
   const { data, error } = await supabase.from('table').select()
   ```

2. **Team Booking Queries**: Always check both `staff_id` and `team_id`:
   ```typescript
   .or(`staff_id.eq.${userId},team_id.in.(${teamIds})`)
   ```

3. **Time Display**: Always format time to remove seconds: `time.split(':').slice(0, 2).join(':')`

4. **Currency**: Always use `formatCurrency()` from `@/lib/utils`, never hardcode $ symbol

5. **Full Address**: Use `formatFullAddress()` from `use-staff-bookings.ts` or join manually: `[address, city, state, zip_code].filter(Boolean).join(', ')`

6. **Import Paths**: Always use `@/` alias for imports from src directory

7. **Build Errors**: Always run `npm run build` before committing to catch TypeScript errors

8. **Component Re-renders**: Use React.memo, useMemo, and useCallback appropriately to prevent unnecessary re-renders in large components

9. **Chart Performance**: For charts with large datasets, implement data sampling or virtualization

10. **State Management**: For components with 5+ useState, consider using useReducer for better organization

11. **Permission Checks**: ALWAYS check permissions before showing UI elements or performing actions
    - Use `usePermissions()` hook: `const { canDelete, hasPermission } = usePermissions()`
    - Example: `{canDelete('bookings') && <DeleteButton />}`

12. **Soft Delete Pattern**: Always exclude soft-deleted records in queries: `.is('deleted_at', null)`
    - For archive view: `.not('deleted_at', 'is', null)`
    - Managers can soft delete; only admins can hard delete

13. **RLS Security**: ⚠️ **CRITICAL** - Never bypass RLS. Always run `enable_rls_policies_v2.sql` before production

14. **User Deletion FK Constraint**: When deleting users who have soft-deleted records (via `deleted_by` column), you'll get FK constraint errors. Run `20250120_fix_deleted_by_foreign_keys.sql` to set `ON DELETE SET NULL` for `deleted_by` columns. This allows user deletion while preserving audit trail.
    ```sql
    -- Example: If FK error occurs when deleting user
    -- Error: "update or delete on table 'profiles' violates foreign key constraint"
    -- Solution: Run the migration or manually update FK to SET NULL
    ALTER TABLE bookings DROP CONSTRAINT bookings_deleted_by_fkey;
    ALTER TABLE bookings ADD CONSTRAINT bookings_deleted_by_fkey
      FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE SET NULL;
    ```

### Git Workflow

**PR Flow (MANDATORY):**
All changes go through Pull Requests — never push directly to `main`.

```bash
# 1. Create feature branch
git checkout -b feat/short-description   # or fix/, refactor/, test/, ci/

# 2. Develop and commit
git add <files>
git commit -m "feat: description"

# 3. Push and create PR
git push -u origin feat/short-description
# Then tell Claude: "เปิด PR ด้วย" — uses gh pr create

# 4. CI runs automatically (5 required checks must pass)
# 5. Merge via GitHub
```

**Branch Naming Convention:**
| Prefix | Usage | Example |
|--------|-------|---------|
| `feat/` | New feature | `feat/recurring-bookings` |
| `fix/` | Bug fix | `fix/currency-display` |
| `refactor/` | Code restructure | `refactor/booking-hooks` |
| `test/` | Test changes | `test/permission-coverage` |
| `ci/` | CI/CD changes | `ci/add-e2e-sharding` |

**Branch Protection on `main`:**
- Required CI checks: `Code Quality`, `Unit Tests`, `Build`, `E2E Tests (Shard 1/2)`, `E2E Tests (Shard 2/2)`
- Force push: blocked
- Direct push: blocked (must use PR)

**Creating PRs with Claude Code:**
```bash
# GitHub CLI is installed and authenticated
# To create a PR, use:
gh pr create --title "feat: description" --body "summary"
```
A PR template (`.github/pull_request_template.md`) auto-populates with project-specific checklist.

**Commit Messages:**
Use conventional format with co-author:
```
Brief summary of changes

- Bullet point 1
- Bullet point 2

> Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Commit Prefixes:** `feat:`, `fix:`, `refactor:`, `test:`, `ci:`, `docs:`, `style:`

**Before Creating PR:**
1. Run `npm run build` to verify no TypeScript errors
2. Run `npm run test:run` to verify unit tests pass
3. Test affected features in dev mode
4. Commit with descriptive message using conventional prefix

### CI/CD Pipeline

**GitHub Actions** (`.github/workflows/ci.yml`):

| Job | Trigger | What it does |
|-----|---------|-------------|
| `Code Quality` | All | ESLint + `tsc --noEmit` |
| `Unit Tests` | All | Vitest with 75% coverage enforcement |
| `Build` | All | Production build validation |
| `E2E Tests` (2 shards) | Push + PR | Playwright Chromium, sharded |
| `Flaky Test Detection` | PR only | Changed specs × 5 burn-in |
| `Cross-Browser` | Weekly | Chromium + Firefox + WebKit |

**Helper Scripts:**
```bash
bash scripts/ci-local.sh              # Mirror CI locally
bash scripts/ci-local.sh --skip-e2e   # Skip Playwright
bash scripts/burn-in.sh               # Burn-in changed specs
bash scripts/burn-in.sh --all         # Burn-in entire suite
```

### Dashboard Architecture

**Component Structure:**
Dashboard ได้ถูก refactor เป็น modular components:
- `src/components/dashboard/` - Dashboard components
  - `DashboardStats.tsx` - Statistics cards (total bookings, revenue, etc.)
  - `DashboardCharts.tsx` - Revenue and booking charts
  - `BookingsByServiceChart.tsx` - Service breakdown chart
  - `RecentActivity.tsx` - Recent activities timeline

**Hooks:**
- `src/hooks/dashboard/useDashboardStats.ts` - Dashboard statistics
- `src/hooks/dashboard/useDashboardCharts.ts` - Chart data processing
- `src/hooks/useChartAnimation.ts` - Chart animation utilities

**Performance:**
- Charts use React.memo for optimization
- Data fetching with proper loading states
- Responsive design for mobile/tablet/desktop

### Reports & Analytics

**Location:** [reports.tsx](src/pages/admin/reports.tsx)

**Features:**
- Revenue analysis by period (day/week/month/year)
- Booking statistics and trends
- Staff performance metrics
- Customer analytics
- Service package popularity
- Export functionality (CSV, PDF)

**Charts:**
- Revenue over time (line chart)
- Booking status distribution (pie chart)
- Top performing staff (bar chart)
- Service package breakdown

### Payment System

**Payment Pages:**
- `src/pages/payment/payment.tsx` - Payment processing page
- `src/pages/payment/payment-success.tsx` - Payment success confirmation

**Components:**
- `src/components/payment/` - Payment-related components

**Integration Status:**
- ✅ Payment UI implemented
- ⚠️ Backend integration pending (Stripe/Omise/PromptPay)
- PromptPay QR code generation available (`promptpay-qr` package)

### Feature Status

**Fully Implemented (✅):**

*Access Control & Security:*
- Three-tier RBAC (Admin, Manager, Staff) with 157 comprehensive tests
- Soft Delete System with archive/restore functionality
- Row Level Security (RLS) policies for all roles
- Permission checking system via `usePermissions` hook

*Dashboard & Analytics:*
- Admin Dashboard with modular components ([dashboard.tsx](src/pages/admin/dashboard.tsx))
- Real-time statistics and interactive charts
- Reports & analytics with CSV/PDF export ([reports.tsx](src/pages/admin/reports.tsx))

*Booking Management:*
- Full CRUD with calendar view ([bookings.tsx](src/pages/admin/bookings.tsx))
- Team and individual staff assignment
- Booking status history (audit trail)
- Weekly schedule view ([weekly-schedule.tsx](src/pages/admin/weekly-schedule.tsx))
- Staff availability tracking

*Customer & Staff Management:*
- Customer profiles with tags and analytics ([customers.tsx](src/pages/admin/customers.tsx))
- Staff Management with auto-generated numbers ([staff.tsx](src/pages/admin/staff.tsx))
- Team Management with team leads ([teams.tsx](src/pages/admin/teams.tsx))
- Staff Portal (dashboard, calendar, profile)

*Communication:*
- Chat system with realtime updates and file attachments ([chat.tsx](src/pages/admin/chat.tsx))
- In-app notification system with realtime
- Settings management ([settings.tsx](src/pages/admin/settings.tsx))

*Services & Payments:*
- Service Packages V1 & V2
- Payment UI with PromptPay QR code generation
- Payment slip upload functionality

**Partially Implemented (⚠️):**
- Recurring Bookings (database schema ready, UI pending)
- Payment Gateway Integration (UI complete, Stripe/Omise backend pending)
- SMS/Email Notifications (Edge functions exist, not fully integrated)

**Not Implemented (❌):**
- Customer Portal (customers cannot self-service booking/tracking)
- Automated booking reminders via cron jobs

**Planned Improvements:**
See [OPTIMIZATION_ROADMAP.md](../OPTIMIZATION_ROADMAP.md) (located in parent directory):
- Large component refactoring (bookings.tsx, customer-detail.tsx)
- Type safety improvements (eliminate `any` types)
- React Query integration for better data caching
- Performance optimization (virtualization, memoization)
- Extended test coverage beyond permission system

### Platform Notes

**Windows Development:**
This project is developed on Windows. Be aware of:
- Use forward slashes `/` in import paths (TypeScript/Vite requirement)
- Git Bash or WSL recommended for Unix-like commands in documentation
- PowerShell alternatives:
  - `ls` → `Get-ChildItem` (or use `ls` alias)
  - `rm -rf` → `Remove-Item -Recurse -Force`
  - `cat` → `Get-Content`
  - `grep` → `Select-String`
- CMD alternatives:
  - `ls` → `dir`
  - `rm` → `del`
  - `rm -rf` → `rmdir /s /q`
- Line endings: Git handles CRLF ↔ LF conversion automatically
- Use Git Bash for commands in this documentation for consistency

### Environment Setup

Required `.env` variables:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

See `.env.example` for template.

Database setup requires running `supabase-schema.sql` in Supabase SQL Editor.

### Development Tools

**Mock Mobile UI:**
The project includes a standalone mobile UI mockup for testing mobile layouts:
- File: `mock-mobile-ui.html`
- Open directly in browser (no server needed)
- Useful for testing mobile-first designs without running dev server
- Contains realistic booking cards, chat UI, and navigation examples

**Additional Documentation:**

*Setup & Migration:*
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Initial setup instructions
- [DATABASE_MIGRATION_GUIDE.md](DATABASE_MIGRATION_GUIDE.md) - Database migration procedures
- [PRE_PRODUCTION_CHECKLIST.md](PRE_PRODUCTION_CHECKLIST.md) - Pre-deployment checklist (RLS, security)
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [RLS_SECURITY_SETUP.md](RLS_SECURITY_SETUP.md) - Row Level Security setup

*Manager Role System:*
- [USER_GUIDE_MANAGER_ROLE.md](USER_GUIDE_MANAGER_ROLE.md) - Manager role user guide
- [ADMIN_GUIDE_USER_MANAGEMENT.md](ADMIN_GUIDE_USER_MANAGEMENT.md) - Admin user management guide
- [MANAGER_ROLE_MIGRATION_GUIDE.md](MANAGER_ROLE_MIGRATION_GUIDE.md) - Manager role migration guide

*Feature Documentation:*
- [EPIC_*.md](.) - Feature epic documentation (Booking, Customer, Staff, Chat)
- [SMART_BOOKING_IMPLEMENTATION.md](SMART_BOOKING_IMPLEMENTATION.md) - Smart booking features
- [BOOKING_FORM_IMPROVEMENTS.md](BOOKING_FORM_IMPROVEMENTS.md) - Booking form enhancements
- [RECURRING_BOOKINGS_PLAN.md](RECURRING_BOOKINGS_PLAN.md) - Recurring bookings (planned feature)

*Optimization & Refactoring:*
- [OPTIMIZATION_ROADMAP.md](OPTIMIZATION_ROADMAP.md) - Performance and refactoring roadmap

### Deployment

**Vercel (Configured):**
- `vercel.json` includes SPA routing configuration
- Rewrites all routes to `/index.html` for React Router
- Deploy: `vercel` or connect GitHub repo

**Build Output:**
- Production build creates `dist/` directory
- Run `npm run build` to create optimized production bundle
- Run `npm run preview` to test production build locally
- **Console logs automatically removed** in production via `vite.config.ts` esbuild settings
- Development builds keep console logs for debugging

**Build Configuration:**
- Vite config (`vite.config.ts`):
  - Path alias: `@/` → `./src`
  - Production minification: esbuild
  - Console/debugger removal in production only
- TypeScript strict mode enabled
- ESLint flat config format
