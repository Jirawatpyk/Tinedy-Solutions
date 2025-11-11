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
rm -rf node_modules/.vite && npm run dev
```

On Windows:
```cmd
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

**Two Roles with Separate Portals:**
- **Admin**: Full system access at `/admin/*` routes
- **Staff**: Limited access at `/staff/*` routes

**Authentication:**
- Flows through `AuthContext` (`src/contexts/auth-context.tsx`)
- Manages `user` (Supabase auth) and `profile` (custom profiles table)
- Profile includes: `role`, `staff_number`, `skills`, etc.
- Protected routes use `ProtectedRoute` component with `allowedRoles` prop

**Auth Flow:**
1. User logs in → `signIn()` authenticates with Supabase
2. On success → Fetches profile from `profiles` table
3. Profile role determines route access (admin vs staff)
4. `ProtectedRoute` checks `profile.role` against `allowedRoles`
5. Unauthorized users redirected to `/unauthorized` or `/login`
6. Auth state persists via Supabase session (localStorage)

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
- `profiles` - User profiles (extends Supabase auth.users)
- `customers` - Customer records with tags and analytics
- `service_packages` - Service offerings (cleaning, training, etc.)
- `bookings` - Main booking records with team/staff assignment
- `teams` - Staff team organization with team leads
- `team_members` - Many-to-many team membership
- `messages` - Internal chat system
- `settings` - Application settings (notifications, business hours)
- `reviews` - Customer ratings for staff (may not exist in all deployments)

**Key Patterns:**
- All tables use Row Level Security (RLS) policies
- Bookings can be assigned to either `staff_id` OR `team_id` (not both)
- Team bookings are visible to all team members
- Auto-generated fields: `staff_number` (STF0001, STF0002...)
- Timestamps: `created_at`, `updated_at` (auto-managed)

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
- `send-booking-reminder` - Sends booking reminder notifications
- Call via: `supabase.functions.invoke('function-name', { body: {...} })`

**Realtime Subscriptions:**
```typescript
const channel = supabase
  .channel('channel-name')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'table_name' }, callback)
  .subscribe()

// Cleanup
return () => supabase.removeChannel(channel)
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

**Recent migrations in `supabase/migrations/`:**
- `add_team_lead.sql` - Team leadership functionality
- `create_settings_table.sql` - Application settings
- `customer_analytics_views.sql` - Customer analytics views
- `enhance_customers_table.sql` - Enhanced customer fields

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
- `src/components/customers/` - Customer-related components
- `src/components/staff/` - Staff-related components
- `src/components/chat/` - Chat system components
- `src/components/notifications/` - Notification components
- `src/components/common/` - Shared components (ConfirmDialog, EmptyState, StatCard, StatusBadge)

**State Management:**
- Global auth state via Context
- Feature state via custom hooks (e.g., `useStaffBookings`)
- Local component state for UI-only concerns

**Custom Hooks** (`src/hooks/`):
- `use-staff-bookings.ts` - Staff booking data with realtime updates
- `use-staff-calendar.ts` - Calendar view for staff
- `use-staff-profile.ts` - Staff profile management
- `use-admin-profile.ts` - Admin profile management
- `use-chat.ts` - Chat functionality with realtime
- `use-notifications.ts` - Notification system
- `use-in-app-notifications.ts` - In-app notification UI
- `use-staff-availability-check.ts` - Staff availability validation
- `use-settings.ts` - Application settings management
- `use-toast.ts` - Toast notification hook

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

### Git Workflow

**Commit Messages:**
Use conventional format with co-author:
```
Brief summary of changes

- Bullet point 1
- Bullet point 2

> Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Before Push:**
1. Run `npm run build` to verify no TypeScript errors
2. Test affected features in dev mode
3. Commit with descriptive message
4. Push to remote

### Feature Status

**Implemented:**
- Admin Dashboard with stats and charts ([dashboard.tsx](src/pages/admin/dashboard.tsx))
- Booking Management with calendar ([bookings.tsx](src/pages/admin/bookings.tsx), [calendar.tsx](src/pages/admin/calendar.tsx))
- Customer Management with detailed profiles ([customers.tsx](src/pages/admin/customers.tsx), [customer-detail.tsx](src/pages/admin/customer-detail.tsx))
- Staff Management with auto-generated staff numbers ([staff.tsx](src/pages/admin/staff.tsx))
- Team Management ([teams.tsx](src/pages/admin/teams.tsx))
- Chat system with realtime updates ([chat.tsx](src/pages/admin/chat.tsx))
- Staff Portal (dashboard, calendar, profile) ([src/pages/staff/](src/pages/staff/))
- Staff Availability and performance tracking
- Service Packages ([service-packages.tsx](src/pages/admin/service-packages.tsx))
- Reports & analytics with export ([reports.tsx](src/pages/admin/reports.tsx))
- Weekly schedule view ([weekly-schedule.tsx](src/pages/admin/weekly-schedule.tsx))
- Settings & notifications ([settings.tsx](src/pages/admin/settings.tsx))

**Not Implemented:**
- Customer Portal (customers cannot self-service)
- Payment Integration (Stripe/Omise)
- SMS/Email Notifications (Edge function exists but not fully integrated)
- Advanced reporting features

### Platform Notes

**Windows Development:**
This project is developed on Windows. Be aware of:
- Use forward slashes `/` in import paths (TypeScript/Vite requirement)
- Git Bash or WSL recommended for Unix-like commands
- PowerShell alternatives: `dir` instead of `ls`, `del` instead of `rm`
- Line endings: Git should handle CRLF conversion automatically

### Environment Setup

Required `.env` variables:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Database setup requires running `supabase-schema.sql` in Supabase SQL Editor.

**Additional Documentation:**
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Initial setup instructions
- [DATABASE_MIGRATION_GUIDE.md](DATABASE_MIGRATION_GUIDE.md) - Database migration procedures
- [EPIC_*.md](.) - Feature epic documentation (Booking, Customer, Staff, Chat)
- [SMART_BOOKING_IMPLEMENTATION.md](SMART_BOOKING_IMPLEMENTATION.md) - Smart booking features
- [BOOKING_FORM_IMPROVEMENTS.md](BOOKING_FORM_IMPROVEMENTS.md) - Booking form enhancements

### Deployment

**Vercel (Configured):**
- `vercel.json` includes SPA routing configuration
- Rewrites all routes to `/index.html` for React Router
- Deploy: `vercel` or connect GitHub repo

**Build Output:**
- Production build creates `dist/` directory
- Run `npm run build` to create optimized production bundle
- Run `npm run preview` to test production build locally
