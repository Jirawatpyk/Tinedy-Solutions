# Tinedy CRM - Development Guide

> Generated: 2026-01-22

## Prerequisites

- **Node.js:** v18+ (LTS recommended)
- **npm:** v9+
- **Supabase Account:** For backend services
- **Git:** For version control

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd tinedy-crm

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Available Scripts

### Development
```bash
npm run dev        # Start Vite dev server (port 5173)
npm run build      # Type-check + production build
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

### Testing
```bash
npm test              # Run tests in watch mode
npm run test:run      # Run tests once (CI mode)
npm run test:ui       # Run tests with Vitest UI
npm run test:coverage # Run tests with coverage report
```

### Specific Tests
```bash
npm test -- permissions    # Run permission tests
npm test -- use-staff      # Run staff hooks tests
npm test -- --run          # Run once without watch
```

## Project Structure

```
src/
├── components/     # React components by feature
│   ├── ui/         # Shadcn primitives
│   ├── common/     # Shared components
│   └── [feature]/  # Feature-specific components
├── hooks/          # Custom React hooks
├── pages/          # Route pages
├── lib/            # Utilities & services
├── types/          # TypeScript type definitions
├── contexts/       # React contexts
├── schemas/        # Zod validation schemas
└── __tests__/      # Test files
```

## Coding Conventions

### Import Aliases
Use `@/` for absolute imports:
```typescript
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/use-permissions'
```

### Component Patterns
```typescript
// Functional components with TypeScript
interface Props {
  title: string
  onClick?: () => void
}

export function MyComponent({ title, onClick }: Props) {
  return <button onClick={onClick}>{title}</button>
}
```

### Hook Patterns
```typescript
// Custom hook with React Query
export function useBookings() {
  return useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .is('deleted_at', null)
      if (error) throw error
      return data
    }
  })
}
```

### Permission Checks
```typescript
import { usePermissions } from '@/hooks/use-permissions'

function MyComponent() {
  const { canDelete, hasPermission } = usePermissions()

  return (
    <>
      {canDelete('bookings') && <DeleteButton />}
      {hasPermission('bookings', 'create') && <CreateButton />}
    </>
  )
}
```

### Currency Formatting
Always use the utility function:
```typescript
import { formatCurrency } from '@/lib/utils'

// ✅ Correct
formatCurrency(1000) // "฿1,000"

// ❌ Wrong - never hardcode $
`$${amount}`
```

### Time Display
Remove seconds when displaying:
```typescript
// Database returns: "14:30:00"
// Display: "14:30"
time.split(':').slice(0, 2).join(':')
```

### Soft Delete Queries
Always filter deleted records:
```typescript
// ✅ Correct
.is('deleted_at', null)

// For archive view
.not('deleted_at', 'is', null)
```

## Database Migrations

Migrations are in `supabase/migrations/` and must be run manually in Supabase Dashboard SQL Editor.

**Critical migrations to run (in order):**
1. `supabase-schema.sql` - Base schema
2. `20250116_add_manager_role.sql` - Manager role
3. `20250116_soft_delete_system.sql` - Soft delete
4. `enable_rls_policies_v2.sql` - RLS policies

## Testing Guidelines

### Test File Location
```
src/
├── lib/
│   ├── permissions.ts
│   └── __tests__/
│       └── permissions.test.ts
├── hooks/
│   ├── use-staff-bookings.ts
│   └── __tests__/
│       └── use-staff-bookings.test.ts
```

### Running Specific Tests
```bash
npm test -- permissions           # By filename
npm test -- src/lib/__tests__/    # By directory
npm test -- --coverage            # With coverage
```

### Coverage Target
- Lines: 75%
- Functions: 75%
- Branches: 75%
- Statements: 75%

## Common Pitfalls

1. **Supabase Queries:** Use async/await, not `.then().catch()`
2. **Team Bookings:** Check both `staff_id` and `team_id`
3. **Time Display:** Always remove seconds
4. **Currency:** Use `formatCurrency()`, never hardcode `$`
5. **Soft Delete:** Always filter `.is('deleted_at', null)`
6. **Permissions:** Always check before showing UI elements

## Build & Deployment

```bash
# Build for production
npm run build

# Preview build locally
npm run preview

# Deploy to Vercel
vercel
```

### Production Build Notes
- Console logs are automatically removed
- Code is minified with esbuild
- Manual chunks configured for optimal loading

## Troubleshooting

### Vite Cache Issues
```bash
# Windows PowerShell
Remove-Item -Recurse -Force node_modules\.vite; npm run dev

# Unix/Mac
rm -rf node_modules/.vite && npm run dev
```

### TypeScript Errors
```bash
# Check types without building
npx tsc --noEmit
```

## Useful Links

- [CLAUDE.md](../CLAUDE.md) - Comprehensive 740+ line developer guide
- [Architecture](./architecture.md) - System architecture
- [Source Tree](./source-tree-analysis.md) - File structure
- [Supabase Dashboard](https://app.supabase.com) - Backend management

---

*Generated by BMad Method document-project workflow*
