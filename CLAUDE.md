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

### Build Issues
If you encounter Vite cache issues during development:
```bash
rm -rf node_modules/.vite && npm run dev
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

### Role-Based Access Control
Two primary roles with separate portals:
- **Admin**: Full system access at `/admin/*` routes
- **Staff**: Limited access at `/staff/*` routes

Authentication flows through `AuthContext` (`src/contexts/auth-context.tsx`):
- Manages `user` (Supabase auth) and `profile` (custom profiles table)
- Profile includes: `role`, `staff_number`, `skills`, etc.
- Protected routes use `ProtectedRoute` component with `allowedRoles` prop

### Database Architecture

**Core Tables:**
- `profiles` - User profiles (extends Supabase auth.users)
- `customers` - Customer records
- `service_packages` - Service offerings (cleaning, training, etc.)
- `bookings` - Main booking records with team/staff assignment
- `teams` - Staff team organization
- `team_members` - Many-to-many team membership
- `messages` - Internal chat system
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

**Status Flow:**
`pending` ’ `confirmed` ’ `in_progress` ’ `completed`/`cancelled`

**Time Format:**
- Database stores `HH:MM:SS`
- UI displays `HH:MM` via `formatTime()` helper
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

### Supabase Integration

**Client Initialization:**
Located in `src/lib/supabase.ts` using environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Edge Functions:**
Located in `supabase/functions/`:
- `create-staff` - Creates staff users with proper auth and profile setup
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

**Recent migrations:**
- `20250122_create_reviews_table.sql` - Reviews system
- `20250122_add_staff_number_and_skills.sql` - Staff fields with auto-generation

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

**Component Patterns:**
- Functional components with hooks
- TypeScript interfaces for all props/data
- Extract reusable logic to custom hooks (`src/hooks/`)
- Use `useCallback` for functions passed to dependencies

**State Management:**
- Global auth state via Context
- Feature state via custom hooks (e.g., `useStaffBookings`)
- Local component state for UI-only concerns

**Error Boundaries:**
- Try-catch blocks for async operations
- Toast notifications for user-facing errors
- Console errors for debugging

**TypeScript:**
- Strict mode enabled
- No implicit any
- Proper typing for Supabase queries
- Use `any` with type assertions only when necessary

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

3. **Time Display**: Always format time to remove seconds before showing to users

4. **Currency**: Always use `formatCurrency()` from utils, never hardcode $ symbol

5. **Full Address**: Always join all address components (address, city, state, zip_code)

6. **Build Errors**: Always run `npm run build` before committing to catch TypeScript errors

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
- Admin Dashboard with stats and charts
- Booking Management (CRUD)
- Customer Management
- Staff Management with auto-generated staff numbers
- Team Management
- Calendar views (admin and staff)
- Chat system with realtime updates
- Staff Availability management
- Service Packages
- Reports with analytics

**Not Implemented:**
- Customer Portal (customers cannot self-service)
- Payment Integration (Stripe/Omise)
- SMS/Email Notifications
- Audit Log (removed - not needed for current scope)
- Advanced reporting features

### Environment Setup

Required `.env` variables:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Database setup requires running `supabase-schema.sql` in Supabase SQL Editor.
