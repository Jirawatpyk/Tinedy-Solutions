# Code Review & Refactoring Skill

## Purpose
Systematically review and refactor large React/TypeScript components in Tinedy CRM to improve maintainability, readability, and code quality. Focus on breaking down large files into smaller, focused, reusable components.

## When to Use
- Component files exceed 500 lines of code
- Components have multiple responsibilities
- Code duplication is detected across files
- State management becomes complex (10+ useState calls)
- Component re-renders are causing performance issues

## Scope
This skill focuses on:
1. **Large File Refactoring** - Breaking down monolithic components
2. **Code Duplication Removal** - Consolidating repeated patterns
3. **Component Extraction** - Creating reusable sub-components
4. **State Management Optimization** - Using custom hooks or reducers
5. **Code Organization** - Improving file structure and imports

## Refactoring Process

### Step 1: Analysis Phase
1. Read the target file completely
2. Identify:
   - Main responsibilities of the component
   - Repeated code patterns
   - Separate UI sections that could be components
   - Complex state management areas
   - Business logic that could be extracted to hooks
   - Helper functions that could be utilities
3. Create a refactoring plan with:
   - List of components to extract
   - List of custom hooks to create
   - List of utilities to extract
   - Estimated impact on other files

### Step 2: Planning Phase
Present the refactoring plan to the user:
- Show current file structure
- Propose new file structure
- List all new files to be created
- Explain benefits of each refactoring
- Get user approval before proceeding

### Step 3: Execution Phase
Execute refactoring in this order:

#### 3.1 Extract Utilities First
```typescript
// Example: Extract helper functions to lib/booking-utils.ts
export const formatFullAddress = (booking: Booking): string => {
  // Implementation
}

export const calculateBookingDuration = (start: string, end: string): number => {
  // Implementation
}
```

#### 3.2 Extract Type Definitions
```typescript
// Example: Move to src/types/booking.ts
export interface Booking {
  id: string
  booking_date: string
  // ... other fields
}

export interface BookingFilters {
  dateRange: string
  status: string[]
  // ... other filters
}
```

#### 3.3 Extract Custom Hooks
```typescript
// Example: Create hooks/use-booking-filters.ts
export const useBookingFilters = () => {
  const [filters, setFilters] = useState<BookingFilters>(initialFilters)

  const updateFilter = (key: keyof BookingFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => {
    setFilters(initialFilters)
  }

  return { filters, updateFilter, resetFilters }
}
```

#### 3.4 Extract UI Components
```typescript
// Example: Create components/booking/BookingFilters.tsx
interface BookingFiltersProps {
  filters: BookingFilters
  onFilterChange: (key: string, value: any) => void
  onReset: () => void
}

export const BookingFilters = ({ filters, onFilterChange, onReset }: BookingFiltersProps) => {
  return (
    <div className="space-y-4">
      {/* Filter UI */}
    </div>
  )
}
```

#### 3.5 Extract Complex Sub-Components
```typescript
// Example: Create components/booking/BookingTable.tsx
interface BookingTableProps {
  bookings: Booking[]
  onEdit: (booking: Booking) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string) => void
}

export const BookingTable = ({ bookings, onEdit, onDelete, onStatusChange }: BookingTableProps) => {
  return (
    <Table>
      {/* Table implementation */}
    </Table>
  )
}
```

#### 3.6 Update Main Component
```typescript
// Simplified main component after refactoring
import { BookingFilters } from '@/components/booking/BookingFilters'
import { BookingTable } from '@/components/booking/BookingTable'
import { useBookingFilters } from '@/hooks/use-booking-filters'

export default function BookingsPage() {
  const { filters, updateFilter, resetFilters } = useBookingFilters()
  const { bookings, isLoading } = useBookings(filters)

  return (
    <MainLayout>
      <BookingFilters
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
      />
      <BookingTable
        bookings={bookings}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </MainLayout>
  )
}
```

### Step 4: Testing Phase
After refactoring:
1. Run `npm run lint` to check for errors
2. Run `npm run build` to ensure TypeScript compilation succeeds
3. Test the refactored component in the browser
4. Verify all functionality works as before
5. Check for any console errors or warnings

### Step 5: Documentation Phase
1. Add JSDoc comments to exported functions
2. Update component props documentation
3. Document any breaking changes
4. Create a refactoring summary

## Refactoring Guidelines

### Component Size Limits
- **Single Component**: Max 300 lines
- **Page Component**: Max 500 lines (orchestration only)
- **Custom Hook**: Max 200 lines
- **Utility File**: Max 300 lines

### File Organization Standards
```
src/
├── components/
│   ├── booking/
│   │   ├── BookingFilters.tsx      # Reusable filter component
│   │   ├── BookingTable.tsx        # Table component
│   │   ├── BookingForm.tsx         # Form component
│   │   ├── BookingActions.tsx      # Action buttons
│   │   └── index.ts                # Barrel export
│   └── ui/                         # Shadcn UI components
├── hooks/
│   ├── use-booking-filters.ts      # Filter state management
│   ├── use-bookings.ts             # Data fetching
│   └── use-booking-form.ts         # Form logic
├── lib/
│   ├── booking-utils.ts            # Helper functions
│   └── booking-validation.ts       # Validation logic
└── types/
    └── booking.ts                  # Type definitions
```

### Naming Conventions
- **Components**: PascalCase (e.g., `BookingTable.tsx`)
- **Hooks**: camelCase with `use-` prefix (e.g., `use-booking-filters.ts`)
- **Utilities**: camelCase (e.g., `booking-utils.ts`)
- **Types**: PascalCase for interfaces (e.g., `interface BookingFilters`)

### Code Quality Rules
1. **Single Responsibility**: Each component/hook should do ONE thing well
2. **DRY Principle**: Don't repeat yourself - extract common code
3. **Composition over Inheritance**: Compose small components into larger ones
4. **Props Interface**: Always define TypeScript interfaces for props
5. **No Magic Numbers**: Use named constants
6. **Error Handling**: Always handle errors gracefully
7. **Loading States**: Always show loading indicators
8. **Accessibility**: Add ARIA labels where needed

## Common Refactoring Patterns

### Pattern 1: Extract Filter Logic
**Before:**
```typescript
const [dateRange, setDateRange] = useState('this-month')
const [status, setStatus] = useState<string[]>([])
const [serviceType, setServiceType] = useState('')
const [staffId, setStaffId] = useState('')
// ... 10+ more filter states
```

**After:**
```typescript
const { filters, updateFilter, resetFilters } = useBookingFilters()
```

### Pattern 2: Extract Data Fetching
**Before:**
```typescript
useEffect(() => {
  const fetchBookings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        // ... complex query
      if (error) throw error
      setBookings(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }
  fetchBookings()
}, [/* dependencies */])
```

**After:**
```typescript
const { bookings, isLoading, error, refetch } = useBookings(filters)
```

### Pattern 3: Extract Form Logic
**Before:**
```typescript
const [formData, setFormData] = useState(initialData)
const [errors, setErrors] = useState({})
const [isSubmitting, setIsSubmitting] = useState(false)

const handleChange = (field: string, value: any) => {
  setFormData(prev => ({ ...prev, [field]: value }))
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  // ... validation and submission logic
}
```

**After:**
```typescript
const { formData, errors, handleChange, handleSubmit, isSubmitting } = useBookingForm({
  initialData,
  onSubmit: async (data) => {
    // ... submission logic
  }
})
```

### Pattern 4: Extract Table Component
**Before:**
```typescript
<div className="overflow-x-auto">
  <table className="w-full">
    <thead>
      <tr>
        <th>Date</th>
        <th>Customer</th>
        {/* ... 10+ columns */}
      </tr>
    </thead>
    <tbody>
      {bookings.map(booking => (
        <tr key={booking.id}>
          <td>{formatDate(booking.date)}</td>
          <td>{booking.customer.name}</td>
          {/* ... 10+ cells */}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**After:**
```typescript
<BookingTable
  bookings={bookings}
  columns={columns}
  onRowClick={handleRowClick}
/>
```

## Refactoring Checklist

Before starting:
- [ ] Read entire file to understand context
- [ ] Identify all dependencies and imports
- [ ] Check for side effects and external state
- [ ] Plan extraction order (utilities → types → hooks → components)

During refactoring:
- [ ] Extract utilities first
- [ ] Move type definitions to shared location
- [ ] Create custom hooks for complex logic
- [ ] Extract UI components bottom-up (leaf components first)
- [ ] Update imports in main component
- [ ] Maintain existing functionality (no behavior changes)

After refactoring:
- [ ] Run linter and fix all errors
- [ ] Run TypeScript compilation
- [ ] Test in browser
- [ ] Check for console errors
- [ ] Verify all features work
- [ ] Add JSDoc comments
- [ ] Update related documentation

## Example: Refactoring bookings.tsx

### Current Structure (2,249 lines)
```
bookings.tsx
├── Imports (50 lines)
├── Interfaces (100 lines)
├── Helper functions (200 lines)
├── Main component (1,899 lines)
│   ├── State declarations (150 lines)
│   ├── Data fetching (200 lines)
│   ├── Event handlers (300 lines)
│   ├── Filter logic (200 lines)
│   ├── Form logic (300 lines)
│   └── JSX (749 lines)
```

### Proposed Structure (Main component: ~200 lines)
```
src/
├── components/booking/
│   ├── BookingFilters.tsx          # Filter UI (150 lines)
│   ├── BookingTable.tsx            # Table display (200 lines)
│   ├── BookingForm.tsx             # Create/Edit form (250 lines)
│   ├── BookingActions.tsx          # Bulk actions (100 lines)
│   ├── BookingStats.tsx            # Statistics cards (100 lines)
│   └── index.ts                    # Exports
├── hooks/
│   ├── use-booking-filters.ts      # Filter state (100 lines)
│   ├── use-bookings.ts             # Data fetching (150 lines)
│   ├── use-booking-form.ts         # Form logic (150 lines)
│   └── use-booking-actions.ts      # Bulk actions (100 lines)
├── lib/
│   ├── booking-utils.ts            # Helpers (150 lines)
│   └── booking-validation.ts       # Validation (100 lines)
├── types/
│   └── booking.ts                  # All booking types (100 lines)
└── pages/admin/
    └── bookings.tsx                # Main page (200 lines - orchestration only)
```

## Anti-Patterns to Avoid

1. **God Components** - Components that do too many things
2. **Prop Drilling** - Passing props through many layers (use Context or state management)
3. **Inline Functions** - Defining functions inside JSX (use useCallback)
4. **Magic Values** - Hardcoded strings/numbers without names
5. **Premature Optimization** - Don't refactor before it's needed
6. **Over-Extraction** - Don't create components for everything (use judgment)

## Success Metrics

After refactoring, the codebase should have:
- ✅ No files over 500 lines
- ✅ Components with single responsibility
- ✅ Reusable components with clear props interfaces
- ✅ Custom hooks for complex business logic
- ✅ Centralized utility functions
- ✅ Consistent naming conventions
- ✅ No code duplication
- ✅ Improved test coverage potential
- ✅ Faster development velocity
- ✅ Easier onboarding for new developers

## Output Format

After completing refactoring, provide:

1. **Summary** - What was refactored and why
2. **File Changes** - List of new files created and modified files
3. **Breaking Changes** - Any API changes (should be none for internal refactoring)
4. **Testing Results** - Lint, build, and manual testing results
5. **Before/After Metrics** - Line counts, complexity scores
6. **Next Steps** - Recommendations for further improvements

## Notes

- Always maintain backward compatibility during refactoring
- Never change behavior, only improve structure
- Commit after each major extraction step
- Get user approval before large structural changes
- Keep the booking system focus - don't break existing functionality
