# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tinedy CRM is an enterprise booking management system for Cleaning and Training services. Built with React 18, TypeScript, Tailwind CSS, and Supabase for backend/auth.

**Key Features:**
- Admin portal for booking/customer/staff/team management
- Staff portal for viewing assignments and schedules
- Real-time chat system
- Automated email reminders (Resend API)
- Calendar view with react-big-calendar
- Reports and analytics
- Role-based access control (admin/staff)

## Development Commands

```bash
# Start development server (port 5173)
npm run dev

# Build for production (TypeScript + Vite)
npm run build

# Lint code (ESLint 9 with TypeScript rules)
npm run lint

# Preview production build
npm run preview
```

## Code Architecture

### Authentication & Authorization Flow

**AuthContext Pattern** (`src/contexts/auth-context.tsx`):
- Wraps entire app in `<AuthProvider>`
- Provides `user`, `profile`, `signIn`, `signUp`, `signOut`
- Profile includes `role` field ('admin' | 'staff') for access control
- Auto-syncs with Supabase auth state via `onAuthStateChange`
- Fetches profile data from `profiles` table on login

**Protected Routes** (`src/App.tsx` + `src/components/auth/protected-route.tsx`):
- `<ProtectedRoute allowedRoles={['admin']}>` guards admin routes
- `<ProtectedRoute allowedRoles={['staff']}>` guards staff routes
- Redirects to `/login` if unauthenticated
- Shows access denied if wrong role

**Route Structure:**
```
/login                    - Public
/admin/*                  - Admin only (dashboard, bookings, customers, etc.)
/staff/*                  - Staff only (dashboard, calendar, profile, chat)
/ (root)                  - Redirects to /admin
```

### Supabase Query Patterns

**Critical: Array vs Object Relations**

Supabase returns related data as **arrays by default**, but TypeScript interfaces often expect **single objects**. Always transform after querying:

```typescript
// L WRONG - TypeScript error: array assigned to object
const { data } = await supabase
  .from('bookings')
  .select('*, customers(full_name)')
setBookings(data)

//  CORRECT - Transform arrays to objects
const { data } = await supabase
  .from('bookings')
  .select('*, customers!inner(full_name)')  // Use !inner for required joins

const transformed = data.map(booking => ({
  ...booking,
  customers: Array.isArray(booking.customers)
    ? booking.customers[0]
    : booking.customers
}))
setBookings(transformed)
```

**Pattern used in:**
- `src/pages/admin/calendar.tsx` (lines 155-161)
- `src/pages/admin/customer-detail.tsx` (lines 263-269)

### Component Organization

**Page-Specific Components:**
- Modal/dialog components used only by one page ’ place in `src/pages/admin/`
- Example: `booking-detail-modal.tsx` is in `src/pages/admin/` not `src/components/`

**Shared Components:**
- UI primitives (shadcn/ui) ’ `src/components/ui/`
- Auth components ’ `src/components/auth/`
- Layout components ’ `src/components/layout/`

### Booking Workflow & Status Transitions

**Valid status transitions** (`src/pages/admin/bookings.tsx` lines 607-617):
```
pending ’ confirmed | cancelled
confirmed ’ in_progress | cancelled | no_show
in_progress ’ completed | cancelled
completed ’ [final state]
cancelled ’ [final state]
no_show ’ [final state]
```

**Conflict Detection:**
Bookings check for staff/team conflicts before creation/update. If conflicts exist, user must explicitly override. See `checkBookingConflicts()` function in bookings.tsx.

### Email System

**Resend Integration** (`src/lib/email.ts`):
- `sendBookingReminder()` sends HTML emails
- Uses `VITE_RESEND_API_KEY` environment variable
- Called from booking detail modal "Send Reminder" button
- Returns `{ success: boolean, error?: string }`

## Styling & Design System

**Tailwind Custom Colors:**
```css
tinedy-blue: #2e4057       /* Primary brand, buttons */
tinedy-green: #8fb996      /* Success, secondary actions */
tinedy-yellow: #e7d188     /* Highlights, warnings */
tinedy-off-white: #f5f3ee  /* Background */
tinedy-dark: #2d241d       /* Text, headings */
```

**Fonts:**
- `font-sans` (Poppins) - Body text
- `font-display` (Raleway) - Headings
- `font-rule` (Sarabun) - Special text

**Mobile-First:** All components designed for mobile first, then scaled up at sm/md/lg/xl breakpoints.

## ESLint Configuration

**Relaxed for pragmatism** (`eslint.config.js`):
- `@typescript-eslint/no-explicit-any`: OFF (Supabase queries often need any)
- `@typescript-eslint/no-unused-vars`: Ignores variables starting with `_`
- `react-hooks/exhaustive-deps`: OFF (manual dependency management)

**Naming convention:** Prefix unused variables with `_` to avoid lint errors:
```typescript
const { booking_id, isEdit: _isEdit, ...data } = formData
```

## Environment Variables

Required `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RESEND_API_KEY=your_resend_api_key  # Optional for email features
```

## Database Schema Notes

**Main Tables:**
- `profiles` - User profiles (id matches auth.users.id)
- `customers` - Customer information
- `service_packages` - Available services (cleaning/training)
- `bookings` - Service bookings (links customer + service + staff/team)
- `teams` - Staff team organization
- `team_members` - Team membership junction table
- `messages` - Chat messages
- `audit_logs` - System audit trail

**Important:** All tables use Row Level Security (RLS). Queries run as authenticated user with role-based policies.

## Common Patterns

### Error Handling
```typescript
try {
  const { data, error } = await supabase.from('table').select()
  if (error) throw error
  // ...
} catch (error) {
  toast({
    title: 'Error',
    description: error instanceof Error ? error.message : 'An error occurred',
    variant: 'destructive'
  })
}
```

### Form Data Management
Large pages (bookings, customer-detail) use multiple `useState` for complex forms. Keep form state local to component, not global context.

### Toast Notifications
Use `useToast()` hook from `@/hooks/use-toast` for all user feedback (success, error, info).

## Deployment

**Build output:** `dist/` directory

**Vercel deployment:**
1. Connect GitHub repository
2. Set environment variables in Vercel dashboard
3. Build command: `npm run build`
4. Output directory: `dist`

**Note:** Bundle size is large (~1.4MB). Consider code splitting for optimization in future.

## Known Issues & Quirks

1. **Vite cache issues:** If dev server behaves oddly, delete `node_modules/.vite` and restart
2. **Supabase type mismatches:** Always check if relations return arrays vs objects after queries
3. **react-big-calendar types:** Custom type definitions in `src/types/react-big-calendar.d.ts` with eslint disabled
4. **Windows paths:** Project uses Windows-style paths (`c:\Users\...`) - adjust for other OS

## Thai Language Support

Many UI strings are in Thai. When modifying user-facing text, maintain Thai language or ask user for translation preferences.
