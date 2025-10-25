# TypeScript Best Practices Skill

## Purpose
Enforce TypeScript best practices throughout Tinedy CRM to improve type safety, code maintainability, and developer experience. Centralize type definitions, eliminate `any` types, and establish consistent typing patterns.

## When to Use
- TypeScript interfaces/types are scattered across files
- Using `any` type too frequently (linting warnings)
- Type definitions are duplicated
- Need to improve type inference
- Adding new features requiring complex types
- Refactoring existing code with poor typing

## Scope
This skill focuses on:
1. **Type Organization** - Centralizing and organizing type definitions
2. **Type Safety** - Eliminating `any` and improving type coverage
3. **Type Inference** - Leveraging TypeScript's inference capabilities
4. **Generic Types** - Creating reusable type utilities
5. **Type Guards** - Runtime type checking
6. **Strict Mode** - Enforcing strict TypeScript configuration

## TypeScript Configuration

### Recommended tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting - STRICT MODE */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noPropertyAccessFromIndexSignature": true,

    /* Path Aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

## Type Organization Strategy

### File Structure
```
src/
├── types/
│   ├── index.ts              # Barrel export
│   ├── booking.ts            # Booking-related types
│   ├── customer.ts           # Customer-related types
│   ├── staff.ts              # Staff-related types
│   ├── team.ts               # Team-related types
│   ├── service.ts            # Service package types
│   ├── analytics.ts          # Analytics types
│   ├── api.ts                # API response types
│   ├── database.ts           # Supabase database types
│   └── common.ts             # Shared utility types
```

### Example: Centralized Type Definitions

#### types/booking.ts
```typescript
// Database schema type
export interface BookingRecord {
  id: string
  booking_date: string
  start_time: string
  end_time: string | null
  customer_id: string
  staff_id: string | null
  team_id: string | null
  service_package_id: string
  total_price: number
  status: BookingStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod | null
  address: string
  city: string
  state: string | null
  zip_code: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Enums for better type safety
export enum BookingStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled'
}

export enum PaymentStatus {
  Unpaid = 'unpaid',
  Paid = 'paid',
  Partial = 'partial',
  Refunded = 'refunded'
}

export enum PaymentMethod {
  Cash = 'cash',
  Transfer = 'transfer',
  CreditCard = 'credit_card',
  PromptPay = 'promptpay'
}

// Related data joins
export interface BookingWithRelations extends BookingRecord {
  customer: CustomerSummary
  staff: StaffSummary | null
  team: TeamSummary | null
  service_packages: ServicePackageSummary
}

// Summary types for nested data
export interface CustomerSummary {
  id: string
  full_name: string
  email: string
  phone: string | null
}

export interface StaffSummary {
  id: string
  full_name: string
  staff_number: string
}

export interface TeamSummary {
  id: string
  name: string
  member_count: number
}

export interface ServicePackageSummary {
  id: string
  name: string
  service_type: string
  price: number
  duration: number
}

// Form types (subset of full record)
export interface BookingFormData {
  booking_date: string
  start_time: string
  customer_id: string
  staff_id?: string
  team_id?: string
  service_package_id: string
  address: string
  city: string
  state?: string
  zip_code?: string
  notes?: string
}

// Filter types
export interface BookingFilters {
  dateRange: DateRangePreset
  status: BookingStatus[]
  paymentStatus: PaymentStatus[]
  serviceType: string[]
  staffId: string[]
  teamId: string[]
  searchQuery: string
}

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'this-week'
  | 'last-week'
  | 'this-month'
  | 'last-month'
  | 'custom'

// API response types
export interface BookingListResponse {
  bookings: BookingWithRelations[]
  total: number
  page: number
  pageSize: number
}

export interface BookingStatsResponse {
  totalBookings: number
  completedBookings: number
  pendingBookings: number
  totalRevenue: number
  completionRate: number
}

// Validation types
export interface BookingValidationResult {
  isValid: boolean
  errors: Record<keyof BookingFormData, string[]>
}

export interface BookingConflictResult {
  hasConflict: boolean
  conflictingBooking: BookingRecord | null
  message: string
}
```

#### types/customer.ts
```typescript
export interface CustomerRecord {
  id: string
  full_name: string
  email: string
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  tags: string[]
  relationship_level: RelationshipLevel
  notes: string | null
  created_at: string
  updated_at: string
}

export enum RelationshipLevel {
  New = 'new',
  Regular = 'regular',
  VIP = 'vip',
  Inactive = 'inactive'
}

export interface CustomerWithStats extends CustomerRecord {
  totalBookings: number
  completedBookings: number
  totalRevenue: number
  lastBookingDate: string | null
  averageRating: number | null
}

export interface CustomerFormData {
  full_name: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  tags?: string[]
  notes?: string
}

export interface CustomerFilters {
  searchQuery: string
  tags: string[]
  relationshipLevel: RelationshipLevel[]
  city: string[]
}
```

#### types/common.ts
```typescript
// Utility types
export type ID = string

export type Timestamp = string

export type Nullable<T> = T | null

export type Optional<T> = T | undefined

export type AsyncState<T> = {
  data: T | null
  loading: boolean
  error: Error | null
}

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T | null
  error: Error | null
  status: number
}

// Generic pagination
export interface PaginationParams {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Form state
export interface FormState<T> {
  data: T
  errors: Partial<Record<keyof T, string>>
  isSubmitting: boolean
  isDirty: boolean
}

// Table column definition
export interface TableColumn<T> {
  key: keyof T
  label: string
  sortable?: boolean
  render?: (value: T[keyof T], row: T) => React.ReactNode
}

// Select option
export interface SelectOption<T = string> {
  label: string
  value: T
  disabled?: boolean
}

// Date range
export interface DateRange {
  start: Date
  end: Date
}

// Filter operator
export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains'

// Generic filter
export interface Filter<T> {
  field: keyof T
  operator: FilterOperator
  value: any
}
```

## TypeScript Best Practices

### 1. Avoid `any` - Use Proper Types

❌ **Bad:**
```typescript
const handleSubmit = (data: any) => {
  console.log(data.name)
}

const fetchBookings = async (): Promise<any> => {
  const response = await supabase.from('bookings').select('*')
  return response.data
}
```

✅ **Good:**
```typescript
const handleSubmit = (data: BookingFormData) => {
  console.log(data.customer_id)
}

const fetchBookings = async (): Promise<BookingWithRelations[]> => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, customer(*), service_packages(*)')

  if (error) throw error
  return data ?? []
}
```

### 2. Use Type Guards for Runtime Checking

```typescript
// Type guard function
export function isBookingWithRelations(
  booking: BookingRecord | BookingWithRelations
): booking is BookingWithRelations {
  return 'customer' in booking && booking.customer !== undefined
}

// Usage
const booking = await fetchBooking(id)
if (isBookingWithRelations(booking)) {
  console.log(booking.customer.full_name) // Safe to access
}
```

### 3. Use Discriminated Unions for State

```typescript
// State machine type
type BookingFormState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: BookingRecord }
  | { status: 'error'; error: Error }

// Type-safe state handling
const handleState = (state: BookingFormState) => {
  switch (state.status) {
    case 'idle':
      return <div>Ready to submit</div>
    case 'loading':
      return <div>Loading...</div>
    case 'success':
      return <div>Booking created: {state.data.id}</div>
    case 'error':
      return <div>Error: {state.error.message}</div>
  }
}
```

### 4. Leverage Type Inference

❌ **Bad (Unnecessary explicit types):**
```typescript
const bookingStatuses: BookingStatus[] = [
  BookingStatus.Pending,
  BookingStatus.Confirmed
]

const getBookingCount = (bookings: BookingRecord[]): number => {
  return bookings.length
}
```

✅ **Good (Let TypeScript infer):**
```typescript
const bookingStatuses = [
  BookingStatus.Pending,
  BookingStatus.Confirmed
] as const // Use 'as const' for literal types

const getBookingCount = (bookings: BookingRecord[]) => {
  return bookings.length // TypeScript infers return type
}
```

### 5. Use Generic Types for Reusability

```typescript
// Generic hook for async data fetching
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  dependencies: React.DependencyList = []
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      try {
        setState({ data: null, loading: true, error: null })
        const data = await fetcher()
        if (!cancelled) {
          setState({ data, loading: false, error: null })
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: error as Error
          })
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, dependencies)

  return state
}

// Usage - TypeScript infers the type
const bookings = useAsyncData(() => fetchBookings())
// bookings.data is BookingWithRelations[] | null
```

### 6. Use Utility Types

```typescript
// Make all properties optional
type PartialBooking = Partial<BookingRecord>

// Make all properties required
type RequiredBooking = Required<BookingFormData>

// Pick specific properties
type BookingIdentifier = Pick<BookingRecord, 'id' | 'booking_date'>

// Omit specific properties
type BookingWithoutTimestamps = Omit<BookingRecord, 'created_at' | 'updated_at'>

// Create type from object keys
const BOOKING_STATUSES = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed'
} as const

type BookingStatusKey = keyof typeof BOOKING_STATUSES
// 'pending' | 'confirmed' | 'completed'

// Create union from object values
type BookingStatusLabel = typeof BOOKING_STATUSES[keyof typeof BOOKING_STATUSES]
// 'Pending' | 'Confirmed' | 'Completed'

// Record type for key-value objects
type BookingStatusMap = Record<BookingStatus, string>
```

### 7. Use `unknown` Instead of `any` for Unsafe Data

```typescript
// API error handling
const handleApiError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}

// Form submission
const handleSubmit = async (event: React.FormEvent) => {
  event.preventDefault()

  const formData = new FormData(event.target as HTMLFormElement)
  const rawData: unknown = Object.fromEntries(formData)

  // Validate before using
  const validatedData = validateBookingData(rawData)
  await submitBooking(validatedData)
}
```

### 8. Define Strict Event Handlers

```typescript
// Typed event handlers
const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = event.target
  setFormData(prev => ({ ...prev, [name]: value }))
}

const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
  const value = event.target.value as BookingStatus
  setStatus(value)
}

const handleButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
  event.preventDefault()
  // Handle click
}

// Custom event types
type BookingEventHandler = (booking: BookingRecord) => void

interface BookingTableProps {
  bookings: BookingRecord[]
  onEdit: BookingEventHandler
  onDelete: BookingEventHandler
  onStatusChange: (id: string, status: BookingStatus) => void
}
```

### 9. Use Const Assertions for Literal Types

```typescript
// Without const assertion
const statuses = ['pending', 'confirmed', 'completed']
// Type: string[]

// With const assertion
const statuses = ['pending', 'confirmed', 'completed'] as const
// Type: readonly ['pending', 'confirmed', 'completed']

// Extract literal type
type Status = typeof statuses[number]
// Type: 'pending' | 'confirmed' | 'completed'

// Object with const assertion
const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  danger: '#ef4444'
} as const

type ColorKey = keyof typeof COLORS
type ColorValue = typeof COLORS[ColorKey]
```

### 10. Proper Supabase Typing

```typescript
// Generate types from Supabase schema
import type { Database } from '@/types/supabase'

type BookingRow = Database['public']['Tables']['bookings']['Row']
type BookingInsert = Database['public']['Tables']['bookings']['Insert']
type BookingUpdate = Database['public']['Tables']['bookings']['Update']

// Type-safe queries
const { data, error } = await supabase
  .from('bookings')
  .select('id, booking_date, customer:customers(full_name)')
  .eq('status', 'confirmed')
  .returns<Array<{
    id: string
    booking_date: string
    customer: { full_name: string } | null
  }>>()
```

## Common Type Patterns for Tinedy CRM

### Pattern 1: Form Hook with Validation

```typescript
interface UseFormOptions<T> {
  initialValues: T
  validate?: (values: T) => Partial<Record<keyof T, string>>
  onSubmit: (values: T) => Promise<void>
}

interface UseFormReturn<T> {
  values: T
  errors: Partial<Record<keyof T, string>>
  isSubmitting: boolean
  handleChange: (field: keyof T, value: T[keyof T]) => void
  handleSubmit: (e: React.FormEvent) => Promise<void>
  reset: () => void
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field: keyof T, value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationErrors = validate?.(values) ?? {}
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(values)
      setValues(initialValues)
      setErrors({})
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const reset = () => {
    setValues(initialValues)
    setErrors({})
  }

  return { values, errors, isSubmitting, handleChange, handleSubmit, reset }
}
```

### Pattern 2: Async Operation State

```typescript
type AsyncOperation<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E }

function useAsyncOperation<T>() {
  const [operation, setOperation] = useState<AsyncOperation<T>>({
    status: 'idle'
  })

  const execute = async (fn: () => Promise<T>) => {
    setOperation({ status: 'loading' })
    try {
      const data = await fn()
      setOperation({ status: 'success', data })
      return data
    } catch (error) {
      setOperation({ status: 'error', error: error as Error })
      throw error
    }
  }

  const reset = () => setOperation({ status: 'idle' })

  return { operation, execute, reset }
}
```

### Pattern 3: Type-Safe Router Params

```typescript
// Define route params
interface BookingDetailParams {
  bookingId: string
}

interface CustomerDetailParams {
  customerId: string
  tab?: 'overview' | 'bookings' | 'history'
}

// Type-safe hook
function useTypedParams<T>(): T {
  return useParams() as T
}

// Usage
const { bookingId } = useTypedParams<BookingDetailParams>()
const { customerId, tab } = useTypedParams<CustomerDetailParams>()
```

## Type Refactoring Checklist

- [ ] Create `src/types/` directory structure
- [ ] Extract all booking-related types to `types/booking.ts`
- [ ] Extract customer types to `types/customer.ts`
- [ ] Extract staff types to `types/staff.ts`
- [ ] Extract common utility types to `types/common.ts`
- [ ] Create barrel export in `types/index.ts`
- [ ] Replace all `any` types with proper types
- [ ] Add type guards where needed
- [ ] Use generic types for reusable components/hooks
- [ ] Add JSDoc comments to complex types
- [ ] Update imports throughout codebase
- [ ] Enable strict TypeScript mode
- [ ] Run type checker and fix all errors
- [ ] Update ESLint to enforce no-explicit-any

## Type Documentation Template

```typescript
/**
 * Represents a booking record from the database.
 *
 * @property id - Unique identifier (UUID)
 * @property booking_date - Date of booking in ISO format (YYYY-MM-DD)
 * @property start_time - Start time in 24h format (HH:mm)
 * @property status - Current status of the booking
 *
 * @example
 * ```typescript
 * const booking: BookingRecord = {
 *   id: 'uuid-here',
 *   booking_date: '2025-10-24',
 *   start_time: '10:00',
 *   status: BookingStatus.Confirmed,
 *   // ... other fields
 * }
 * ```
 */
export interface BookingRecord {
  // ... fields
}
```

## Output Format

After implementing TypeScript improvements, provide:

1. **Type Audit** - Count of types organized vs scattered
2. **Any Usage Report** - List of remaining `any` usages to fix
3. **Type Coverage** - Percentage of properly typed code
4. **Migration Guide** - How to import and use new centralized types
5. **Breaking Changes** - Any type changes affecting existing code
6. **Next Steps** - Areas still needing type improvements

## Notes

- Prioritize type safety over convenience
- Use strict TypeScript configuration
- Document complex types with JSDoc
- Keep types close to usage but avoid duplication
- Use barrel exports for clean imports
- Leverage TypeScript's inference when possible
- Always type component props and hook return values
