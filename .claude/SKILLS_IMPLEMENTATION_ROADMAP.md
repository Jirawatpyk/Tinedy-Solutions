# Tinedy CRM - Claude Skills Implementation Roadmap

> **Generated:** 2025-10-24
> **Version:** 1.0
> **Status:** Draft - Awaiting Approval

---

## 📊 Executive Summary

### Current State Analysis
- **Total Codebase:** 24,818 lines across 78 TypeScript/TSX files
- **Test Coverage:** 0% (No test files)
- **Largest Files:** 3 files over 1,500 lines (Critical refactoring needed)
- **Code Duplication:** High (10+ repeated patterns identified)
- **Performance Issues:** Missing memoization, 36 useState in single component
- **Type Safety:** Good overall, but scattered interfaces

### Expected Outcomes After Implementation
- 📉 Reduce average component size from 680 to 200 lines
- ✅ Achieve 75%+ test coverage
- ⚡ 20% faster render performance
- 🎨 Consistent UI with shared component library
- 🔒 Centralized type definitions
- 📦 10-15% smaller bundle size

---

## 🎯 Implementation Strategy

### Phased Approach (5 Phases over 5-7 Weeks)

```
Phase 1: Foundation (Week 1-2)     → Component Library + Type Consolidation
Phase 2: Refactoring (Week 2-3)    → Extract Large Components
Phase 3: Performance (Week 3-4)    → Add Memoization & Optimization
Phase 4: Architecture (Week 4-5)   → Complete Large File Decomposition
Phase 5: Testing (Week 5-7)        → Comprehensive Test Coverage
```

### Total Estimated Effort
- **215 hours** (~5-7 weeks for 1 developer)
- **Quick Wins:** 18 hours can deliver immediate value

---

## 🚨 Critical Issues Identified

### Priority 1: Urgent Refactoring (Files Over 1,500 Lines)

#### 1. `src/pages/admin/bookings.tsx` - 2,400 lines ⚠️
**Issues:**
- 36 useState calls (excessive state management)
- 15 .map() operations (multiple list renderings)
- 4 useEffect hooks
- No memoization (React.memo, useMemo, useCallback)
- Complex booking conflict detection logic
- Bulk operations, pagination, payment status management

**Impact:** Core booking system - any bugs here affect primary business function

**Refactoring Plan:**
```
bookings.tsx (2,400 lines) →
├── BookingFiltersPanel.tsx (~200 lines)
├── BookingTable.tsx (~300 lines)
├── BookingFormModal.tsx (~400 lines)
├── ConflictDetectionPanel.tsx (~250 lines)
├── BulkActionsToolbar.tsx (~150 lines)
└── BookingsPage.tsx (~400 lines - orchestration)

Custom Hooks:
├── useBookingFilters.ts
├── useBookingForm.ts
├── useConflictDetection.ts
└── useBookingPagination.ts
```

---

#### 2. `src/pages/admin/reports.tsx` - 2,235 lines ⚠️
**Issues:**
- 33 .map() operations (extensive chart data transformations)
- 12 useState calls
- Heavy analytics calculations
- No memoization of chart data
- Multiple chart libraries imported

**Impact:** Performance bottleneck - slow rendering affects user experience

**Refactoring Plan:**
```
reports.tsx (2,235 lines) →
├── RevenueAnalyticsSection.tsx (~400 lines)
│   ├── RevenueChart.tsx
│   ├── BookingsChart.tsx
│   └── ServiceTypeChart.tsx
├── CustomerAnalyticsSection.tsx (~400 lines)
│   ├── CustomerSegmentationChart.tsx
│   ├── TopCustomersTable.tsx
│   └── CustomerGrowthChart.tsx
├── StaffAnalyticsSection.tsx (~400 lines)
│   ├── StaffPerformanceTable.tsx
│   └── UtilizationChart.tsx
├── TeamAnalyticsSection.tsx (~300 lines)
└── ReportsPage.tsx (~300 lines - orchestration)

Custom Hooks:
├── useReportData.ts (centralized data fetching)
├── useReportFilters.ts
└── useChartOptimization.ts
```

---

#### 3. `src/pages/admin/customer-detail.tsx` - 1,908 lines ⚠️
**Issues:**
- 23 useState calls
- 4 useEffect hooks
- Customer profile, booking history, notes, tags all in one file
- Complex relationship level calculations

**Impact:** Customer management - affects data accuracy and UX

**Refactoring Plan:**
```
customer-detail.tsx (1,908 lines) →
├── CustomerProfileHeader.tsx (~200 lines)
├── CustomerBookingHistory.tsx (~400 lines)
├── CustomerStatsPanel.tsx (~250 lines)
├── CustomerNotesSection.tsx (~200 lines)
├── CustomerTagsManager.tsx (~150 lines)
├── CustomerEditForm.tsx (~300 lines)
└── CustomerDetailPage.tsx (~300 lines - orchestration)

Custom Hooks:
├── useCustomerProfile.ts
├── useCustomerBookings.ts
└── useCustomerStats.ts
```

---

### Priority 2: Code Duplication (High ROI Quick Wins)

#### Duplicated Utility: `formatFullAddress`
**Found in:**
- `src/pages/admin/bookings.tsx` (lines 35-44)
- `src/hooks/use-staff-bookings.ts` (lines 26-35)

**Usage count:** 13 instances across 12 files

**Quick Win Action:**
```typescript
// Create: src/lib/address-utils.ts
export function formatFullAddress(address: {
  address: string
  city: string
  state: string
  zip_code: string
}): string {
  const parts = [address.address, address.city, address.state, address.zip_code]
    .filter(part => part && part.trim())
  return parts.join(', ')
}
```
**Effort:** 2 hours | **ROI:** High

---

#### Duplicated Pattern: Status Badges
**Found in:** 10+ files (bookings.tsx, calendar.tsx, dashboard.tsx, customers.tsx, etc.)

**Pattern:**
```tsx
// BEFORE (repeated 10+ times)
<span className={`px-2 py-1 rounded-full text-xs ${
  status === 'completed' ? 'bg-green-100 text-green-800' :
  status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
  'bg-red-100 text-red-800'
}`}>
  {status}
</span>

// AFTER (create once, use everywhere)
<StatusBadge variant={getBookingStatusVariant(status)}>
  {status}
</StatusBadge>
```

**Quick Win Action:**
```typescript
// Create: src/components/common/StatusBadge/StatusBadge.tsx
export const StatusBadge = ({ variant, children }) => { /* ... */ }
export const getBookingStatusVariant = (status: string) => { /* ... */ }
export const getPaymentStatusVariant = (status: string) => { /* ... */ }
```
**Effort:** 4 hours | **ROI:** Very High

---

#### Duplicated Pattern: Empty States
**Found in:** 13 files checking `data.length === 0`

**Quick Win Action:**
```typescript
// Create: src/components/common/EmptyState/EmptyState.tsx
export const EmptyState = ({ icon, title, description, action }) => { /* ... */ }

// Usage:
<EmptyState
  icon={Calendar}
  title="No bookings found"
  description="Create your first booking to get started"
  action={{ label: 'Create Booking', onClick: handleCreate }}
/>
```
**Effort:** 3 hours | **ROI:** High

---

### Priority 3: Performance Issues

#### Missing React.memo
**Files needing memo:** 50+ components
- All table row components
- All card components (BookingCard, StatsCard, etc.)
- Filter panels
- Modal content components

**Impact:** Unnecessary re-renders causing lag with large datasets

**Action:**
```typescript
// BEFORE
export const BookingCard = ({ booking }) => { /* ... */ }

// AFTER
export const BookingCard = React.memo(({ booking }) => { /* ... */ })
```
**Effort:** 8 hours | **ROI:** High (measurable performance gain)

---

#### Missing useMemo/useCallback
**Critical locations:**
- `bookings.tsx`: filteredBookings array (re-computed every render)
- `reports.tsx`: chartData transformations (33 .map() calls)
- `customer-detail.tsx`: customer statistics calculations

**Action:**
```typescript
// BEFORE
const filteredBookings = bookings.filter(/* complex filter logic */)

// AFTER
const filteredBookings = useMemo(
  () => bookings.filter(/* complex filter logic */),
  [bookings, statusFilter, dateFrom, dateTo, searchQuery]
)
```
**Effort:** 22 hours | **ROI:** Very High (20% faster renders)

---

### Priority 4: Testing Gap (0% Coverage)

#### Critical Business Logic Without Tests
**High Risk Files:**
1. `src/hooks/use-staff-bookings.ts` (507 lines) - Booking conflict detection
2. `src/hooks/use-staff-availability-check.ts` (461 lines) - Time validation
3. `src/lib/analytics.ts` (610 lines) - Revenue calculations
4. `src/lib/export.ts` (469 lines) - Data export accuracy

**Impact:** No safety net for refactoring, high bug risk

**Action:** Implement comprehensive testing (see Phase 5)
**Effort:** 60 hours | **ROI:** Critical (enables safe refactoring)

---

## 📅 Detailed Implementation Timeline

### Phase 1: Foundation (Week 1-2) - 40 hours

#### Week 1: Component Library Creation

**Day 1-2: Status Badge Components (6 hours)**
```bash
Claude Skill: @component-library-generator
```
- [ ] Create `src/components/common/StatusBadge/StatusBadge.tsx`
- [ ] Add variants: success, warning, danger, info, purple
- [ ] Create helper functions: `getBookingStatusVariant()`, `getPaymentStatusVariant()`
- [ ] Add TypeScript interfaces with JSDoc
- [ ] Create barrel export in `index.ts`
- [ ] **Replace usage in:** bookings.tsx, calendar.tsx, dashboard.tsx (10+ files)

**Deliverable:** Reusable `<StatusBadge>` component used in 10+ locations

---

**Day 2-3: Card Components (6 hours)**
```bash
Claude Skill: @component-library-generator
```
- [ ] Create `src/components/common/StatCard/StatCard.tsx`
- [ ] Add props: title, value, icon, trend, description, action, isLoading
- [ ] Create loading skeleton states
- [ ] Add TypeScript interfaces
- [ ] **Replace usage in:** dashboard.tsx, reports.tsx, staff/dashboard.tsx

**Deliverable:** Reusable `<StatCard>` component with trend indicators

---

**Day 3-4: Dialog Wrappers (6 hours)**
```bash
Claude Skill: @component-library-generator
```
- [ ] Create `src/components/common/ConfirmDialog/ConfirmDialog.tsx`
- [ ] Add props: title, description, confirmLabel, variant (default/destructive)
- [ ] Add loading state support
- [ ] Create `src/components/common/DetailModal/DetailModal.tsx`
- [ ] **Replace usage in:** All delete confirmations, status change confirmations

**Deliverable:** Consistent dialog patterns across app

---

**Day 4: Empty State Component (3 hours)**
```bash
Claude Skill: @component-library-generator
```
- [ ] Create `src/components/common/EmptyState/EmptyState.tsx`
- [ ] Add props: icon, title, description, primaryAction, secondaryAction
- [ ] **Replace usage in:** All list views (bookings, customers, staff, teams)

**Deliverable:** Consistent empty states with clear CTAs

---

**Day 5: Data Table Filters (4 hours)**
```bash
Claude Skill: @component-library-generator
```
- [ ] Create `src/components/common/DataTableFilters/DataTableFilters.tsx`
- [ ] Add search, status filter, date range picker
- [ ] Make composable for different entity types
- [ ] **Replace usage in:** bookings.tsx, customers.tsx, staff.tsx

**Deliverable:** Reusable filter component

---

#### Week 2: Type Consolidation

**Day 6-7: Centralize Types (10 hours)**
```bash
Claude Skill: @typescript-best-practices
```

- [ ] Create `src/types/booking.ts`
  - Export: `Booking`, `BookingStatus`, `PaymentStatus`, `BookingWithRelations`
  - Remove duplicates from: bookings.tsx, calendar.tsx, use-staff-bookings.ts

- [ ] Create `src/types/customer.ts`
  - Export: `Customer`, `CustomerWithStats`, `RelationshipLevel`
  - Remove duplicates from: customer-detail.tsx, bookings.tsx, customers.tsx

- [ ] Create `src/types/staff.ts`
  - Export: `Staff`, `StaffWithBookings`, `StaffAvailability`

- [ ] Create `src/types/common.ts`
  - Export: `AsyncState<T>`, `PaginationParams`, `FilterParams`, `SelectOption`

- [ ] Update all imports across codebase (automated with IDE)

**Deliverable:** Centralized type definitions in `src/types/`

---

**Day 8-9: Consolidate Utilities (5 hours)**
```bash
Claude Skill: @typescript-best-practices
```

- [ ] Create `src/lib/address-utils.ts`
  ```typescript
  export function formatFullAddress(address: AddressFields): string
  export function isValidAddress(address: unknown): boolean
  ```
  - Remove duplicate from bookings.tsx, use-staff-bookings.ts
  - Update 13 usage locations

- [ ] Create `src/lib/status-utils.ts`
  ```typescript
  export const BOOKING_STATUS_COLORS = { /* ... */ }
  export const PAYMENT_STATUS_COLORS = { /* ... */ }
  export function getStatusLabel(status: BookingStatus): string
  export function isValidStatusTransition(from, to): boolean
  ```
  - Extract from calendar.tsx lines 83-97

- [ ] Update barrel exports in `src/lib/index.ts`

**Deliverable:** DRY utilities with single source of truth

---

**Phase 1 Checkpoint:**
- ✅ 5 reusable components created
- ✅ Types centralized and deduplicated
- ✅ Utilities consolidated
- ✅ 10+ files updated to use shared components
- ✅ Foundation ready for large refactoring

---

### Phase 2: Hook Extraction & Refactoring (Week 2-3) - 50 hours

#### Week 2-3: Custom Hooks

**Day 10-11: Extract Booking Hooks (20 hours)**
```bash
Claude Skill: @code-review-refactoring
```

**Create `src/hooks/useBookingFilters.ts`:**
```typescript
export function useBookingFilters() {
  // Consolidate 10+ filter-related useState calls
  const [filters, setFilters] = useState<BookingFilters>({ /* ... */ })

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  return { filters, updateFilter, resetFilters }
}
```

**Create `src/hooks/useBookingForm.ts`:**
```typescript
export function useBookingForm(initialData?: Partial<Booking>) {
  // Consolidate form-related useState calls
  const [formData, setFormData] = useState<BookingFormData>(/* ... */)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = useCallback((field, value) => { /* ... */ }, [])
  const handleSubmit = useCallback(async () => { /* ... */ }, [formData])
  const reset = useCallback(() => { /* ... */ }, [])

  return { formData, errors, isSubmitting, handleChange, handleSubmit, reset }
}
```

**Create `src/hooks/useConflictDetection.ts`:**
```typescript
export function useConflictDetection(booking: BookingFormData) {
  const [conflicts, setConflicts] = useState<Booking[]>([])
  const [isChecking, setIsChecking] = useState(false)

  const checkConflicts = useCallback(async () => {
    // Extract conflict detection logic from bookings.tsx
  }, [booking.staff_id, booking.team_id, booking.booking_date, booking.start_time])

  useEffect(() => {
    checkConflicts()
  }, [checkConflicts])

  return { conflicts, isChecking, recheckConflicts: checkConflicts }
}
```

**Create `src/hooks/useBookingPagination.ts`:**
```typescript
export function useBookingPagination<T>(items: T[], itemsPerPage = 10) {
  const [currentPage, setCurrentPage] = useState(1)

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return items.slice(start, start + itemsPerPage)
  }, [items, currentPage, itemsPerPage])

  const totalPages = Math.ceil(items.length / itemsPerPage)

  return {
    items: paginatedItems,
    currentPage,
    totalPages,
    setCurrentPage,
    nextPage: () => setCurrentPage(p => Math.min(p + 1, totalPages)),
    prevPage: () => setCurrentPage(p => Math.max(p - 1, 1)),
  }
}
```

**Deliverable:** 4 custom hooks extracting complex logic from bookings.tsx

---

**Day 12-14: Refactor bookings.tsx (20 hours)**
```bash
Claude Skill: @code-review-refactoring
```

**Step 1: Extract Filter Panel Component**
- [ ] Create `src/components/booking/BookingFiltersPanel.tsx` (~200 lines)
- [ ] Move search input, status filter, date range, staff/team filter UI
- [ ] Use `useBookingFilters()` hook
- [ ] Props: `filters`, `onFilterChange`, `onReset`

**Step 2: Extract Table Component**
- [ ] Create `src/components/booking/BookingTable.tsx` (~300 lines)
- [ ] Move table rendering logic
- [ ] Add React.memo for performance
- [ ] Props: `bookings`, `onEdit`, `onDelete`, `onStatusChange`, `onRowClick`

**Step 3: Extract Form Modal**
- [ ] Create `src/components/booking/BookingFormModal.tsx` (~400 lines)
- [ ] Move create/edit form logic
- [ ] Use `useBookingForm()` hook
- [ ] Use `useConflictDetection()` hook
- [ ] Props: `isOpen`, `onClose`, `booking?`, `onSubmit`

**Step 4: Extract Conflict Panel**
- [ ] Create `src/components/booking/ConflictDetectionPanel.tsx` (~250 lines)
- [ ] Move conflict display and override UI
- [ ] Props: `conflicts`, `onOverride`, `onCancel`

**Step 5: Extract Bulk Actions**
- [ ] Create `src/components/booking/BulkActionsToolbar.tsx` (~150 lines)
- [ ] Move bulk selection and status update UI
- [ ] Props: `selectedBookings`, `onBulkAction`, `onClearSelection`

**Step 6: Simplify Main Page**
- [ ] Update `src/pages/admin/bookings.tsx` to orchestrate components
- [ ] Reduce from 2,400 to ~400 lines
- [ ] Use all extracted hooks and components
- [ ] Add proper memoization

**Final Structure:**
```tsx
// bookings.tsx (~400 lines - orchestration only)
import { BookingFiltersPanel } from '@/components/booking/BookingFiltersPanel'
import { BookingTable } from '@/components/booking/BookingTable'
import { BookingFormModal } from '@/components/booking/BookingFormModal'
import { useBookingFilters } from '@/hooks/useBookingFilters'
import { useBookings } from '@/hooks/useBookings'
import { useBookingPagination } from '@/hooks/useBookingPagination'

export default function BookingsPage() {
  const { filters, updateFilter, resetFilters } = useBookingFilters()
  const { bookings, isLoading, refetch } = useBookings(filters)
  const { items, currentPage, totalPages, setCurrentPage } = useBookingPagination(bookings)

  return (
    <MainLayout>
      <BookingFiltersPanel filters={filters} onChange={updateFilter} onReset={resetFilters} />
      <BookingTable bookings={items} onEdit={handleEdit} onDelete={handleDelete} />
      <Pagination current={currentPage} total={totalPages} onChange={setCurrentPage} />
      <BookingFormModal isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={refetch} />
    </MainLayout>
  )
}
```

**Deliverable:** bookings.tsx reduced from 2,400 to ~400 lines, 5 new components, 4 new hooks

---

**Day 15-16: Refactor customer-detail.tsx (10 hours)**
```bash
Claude Skill: @code-review-refactoring
```

**Extract Components:**
- [ ] `CustomerProfileHeader.tsx` - Name, email, phone, avatar
- [ ] `CustomerBookingHistory.tsx` - Booking list with pagination
- [ ] `CustomerStatsPanel.tsx` - Total bookings, revenue, last visit
- [ ] `CustomerNotesSection.tsx` - Notes CRUD
- [ ] `CustomerTagsManager.tsx` - Tag selection and management
- [ ] `CustomerEditForm.tsx` - Edit customer modal

**Extract Hooks:**
- [ ] `useCustomerProfile.ts` - Fetch customer data
- [ ] `useCustomerBookings.ts` - Fetch customer bookings with pagination
- [ ] `useCustomerStats.ts` - Calculate customer metrics

**Deliverable:** customer-detail.tsx reduced from 1,908 to ~300 lines

---

**Phase 2 Checkpoint:**
- ✅ bookings.tsx: 2,400 → 400 lines (83% reduction)
- ✅ customer-detail.tsx: 1,908 → 300 lines (84% reduction)
- ✅ 11 new focused components created
- ✅ 7 custom hooks extracting business logic
- ✅ Easier to test, maintain, and understand

---

### Phase 3: Performance Optimization (Week 3-4) - 30 hours

**Day 17-18: Add React.memo (8 hours)**
```bash
Claude Skill: @performance-optimization
```

**Components to memoize:**
- [ ] `BookingCard.tsx` - Used in lists
- [ ] `BookingTableRow.tsx` - Table performance
- [ ] `CustomerCard.tsx` - Customer list
- [ ] `StaffCard.tsx` - Staff list
- [ ] `StatCard.tsx` - Dashboard cards
- [ ] `StatusBadge.tsx` - Used everywhere
- [ ] All filter panel components

**Pattern:**
```typescript
export const BookingCard = React.memo(({ booking }: BookingCardProps) => {
  return (
    <Card>
      {/* ... */}
    </Card>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return prevProps.booking.id === nextProps.booking.id &&
         prevProps.booking.updated_at === nextProps.booking.updated_at
})

BookingCard.displayName = 'BookingCard'
```

**Deliverable:** 20+ components with React.memo, measurable performance improvement

---

**Day 19-20: Add useCallback (10 hours)**
```bash
Claude Skill: @performance-optimization
```

**Critical handlers to memoize:**

**In bookings.tsx:**
```typescript
const handleEdit = useCallback((booking: Booking) => {
  setSelectedBooking(booking)
  setShowEditModal(true)
}, [])

const handleDelete = useCallback(async (id: string) => {
  await deleteBooking(id)
  refetch()
}, [refetch])

const handleFilterChange = useCallback((key: string, value: any) => {
  updateFilter(key, value)
}, [updateFilter])
```

**In reports.tsx:**
```typescript
const handleDateRangeChange = useCallback((range: DateRange) => {
  setDateRange(range)
}, [])

const handleTabChange = useCallback((tab: string) => {
  setActiveTab(tab)
}, [])
```

**Pattern:**
- Identify all event handlers passed as props
- Wrap with useCallback
- Include proper dependencies

**Deliverable:** 30+ handlers with useCallback, preventing prop change re-renders

---

**Day 21-22: Add useMemo (12 hours)**
```bash
Claude Skill: @performance-optimization
```

**Critical computations to memoize:**

**In bookings.tsx:**
```typescript
const filteredBookings = useMemo(() => {
  return bookings.filter(booking => {
    // Complex filter logic
    if (filters.status.length > 0 && !filters.status.includes(booking.status)) {
      return false
    }
    if (filters.searchQuery && !booking.customer.full_name.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
      return false
    }
    // ... more filters
    return true
  })
}, [bookings, filters.status, filters.searchQuery, filters.dateFrom, filters.dateTo])
```

**In reports.tsx:**
```typescript
const revenueChartData = useMemo(() => {
  return bookings
    .filter(b => b.status === 'completed')
    .reduce((acc, booking) => {
      // Complex aggregation
      return acc
    }, [] as ChartDataPoint[])
}, [bookings])

const customerSegmentationData = useMemo(() => {
  return calculateSegmentation(customersWithBookings)
}, [customersWithBookings])
```

**In customer-detail.tsx:**
```typescript
const customerStats = useMemo(() => ({
  totalBookings: bookings.length,
  completedBookings: bookings.filter(b => b.status === 'completed').length,
  totalRevenue: bookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + b.total_price, 0),
  averageBookingValue: /* calculation */,
}), [bookings])
```

**Deliverable:** 15+ expensive computations memoized, 20% faster renders measured

---

**Phase 3 Checkpoint:**
- ✅ React.memo on 20+ list/card components
- ✅ useCallback on 30+ event handlers
- ✅ useMemo on 15+ expensive calculations
- ✅ Measurable performance improvement (React DevTools Profiler)
- ✅ Smooth scrolling even with 100+ items

---

### Phase 4: Architecture Refactoring (Week 4-5) - 35 hours

**Day 23-27: Refactor reports.tsx (25 hours)**
```bash
Claude Skill: @code-review-refactoring
```

**Step 1: Extract Data Hook (8 hours)**
```typescript
// Create: src/hooks/useReportData.ts
export function useReportData(dateRange: string, filters: ReportFilters) {
  const [data, setData] = useState<ReportData>({
    bookings: [],
    customers: [],
    staff: [],
    teams: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      // Parallel data fetching
      const [bookings, customers, staff, teams] = await Promise.all([
        fetchBookings(dateRange),
        fetchCustomers(),
        fetchStaff(),
        fetchTeams(),
      ])

      setData({ bookings, customers, staff, teams })
      setIsLoading(false)
    }

    fetchData()
  }, [dateRange])

  // Memoize all calculations
  const revenueMetrics = useMemo(() => calculateRevenue(data.bookings), [data.bookings])
  const customerMetrics = useMemo(() => calculateCustomerMetrics(data.customers, data.bookings), [data.customers, data.bookings])
  const staffMetrics = useMemo(() => calculateStaffMetrics(data.staff, data.bookings), [data.staff, data.bookings])

  return {
    isLoading,
    revenueMetrics,
    customerMetrics,
    staffMetrics,
    rawData: data,
  }
}
```

**Step 2: Extract Analytics Sections (17 hours)**

**Create `src/components/reports/RevenueAnalyticsSection.tsx`:**
- Extract revenue charts (line chart, bar chart, service type breakdown)
- Extract booking trends
- Extract peak hours analysis
- Props: `data`, `dateRange`

**Create `src/components/reports/CustomerAnalyticsSection.tsx`:**
- Extract customer segmentation pie chart
- Extract top customers table
- Extract customer growth chart
- Props: `customers`, `bookings`

**Create `src/components/reports/StaffAnalyticsSection.tsx`:**
- Extract staff performance table
- Extract utilization chart
- Extract earnings breakdown
- Props: `staff`, `bookings`

**Create `src/components/reports/TeamAnalyticsSection.tsx`:**
- Extract team performance table
- Extract team comparison charts
- Props: `teams`, `bookings`

**Step 3: Simplify Main Reports Page**
```tsx
// reports.tsx (~300 lines - orchestration only)
import { RevenueAnalyticsSection } from '@/components/reports/RevenueAnalyticsSection'
import { CustomerAnalyticsSection } from '@/components/reports/CustomerAnalyticsSection'
import { StaffAnalyticsSection } from '@/components/reports/StaffAnalyticsSection'
import { TeamAnalyticsSection } from '@/components/reports/TeamAnalyticsSection'
import { useReportData } from '@/hooks/useReportData'

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('this-month')
  const [activeTab, setActiveTab] = useState('revenue')
  const { isLoading, revenueMetrics, customerMetrics, staffMetrics } = useReportData(dateRange)

  if (isLoading) return <LoadingState />

  return (
    <MainLayout>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <RevenueAnalyticsSection data={revenueMetrics} dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="customers">
          <CustomerAnalyticsSection data={customerMetrics} />
        </TabsContent>

        <TabsContent value="staff">
          <StaffAnalyticsSection data={staffMetrics} />
        </TabsContent>

        <TabsContent value="teams">
          <TeamAnalyticsSection data={teamMetrics} />
        </TabsContent>
      </Tabs>
    </MainLayout>
  )
}
```

**Deliverable:** reports.tsx reduced from 2,235 to ~300 lines, 4 section components, 1 data hook

---

**Day 28-29: Other Large Components (10 hours)**
```bash
Claude Skill: @code-review-refactoring
```

**Refactor remaining 500+ line files:**
- [ ] `customers.tsx` (909 lines) → Extract CustomerFilters, CustomerTable, CustomerForm
- [ ] `dashboard.tsx` (875 lines) → Extract DashboardStats, RecentBookings, QuickActions
- [ ] `teams.tsx` (780 lines) → Extract TeamList, TeamForm, TeamMemberManager
- [ ] `staff.tsx` (731 lines) → Extract StaffList, StaffForm, StaffAvailability

**Pattern:** Same as bookings.tsx refactoring
- Extract filters to separate component
- Extract table/list to separate component
- Extract forms to modals
- Create custom hooks for data fetching

**Deliverable:** All large pages under 500 lines

---

**Phase 4 Checkpoint:**
- ✅ reports.tsx: 2,235 → 300 lines (87% reduction)
- ✅ 4 other large pages refactored
- ✅ All page components under 500 lines
- ✅ Average component size: 680 → 200 lines
- ✅ Easier to navigate and maintain codebase

---

### Phase 5: Testing Implementation (Week 5-7) - 60 hours

**Week 5: Setup & Critical Business Logic**

**Day 30: Test Infrastructure Setup (6 hours)**
```bash
Claude Skill: @testing-implementation
```

- [ ] Install testing dependencies:
  ```bash
  npm install -D vitest @testing-library/react @testing-library/jest-dom
  npm install -D @testing-library/user-event @vitest/ui happy-dom
  npm install -D @vitest/coverage-v8 @faker-js/faker
  ```

- [ ] Create `vitest.config.ts`:
  ```typescript
  import { defineConfig } from 'vitest/config'
  import react from '@vitejs/plugin-react'
  import path from 'path'

  export default defineConfig({
    plugins: [react()],
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        thresholds: {
          lines: 75,
          functions: 75,
          branches: 75,
          statements: 75
        }
      }
    },
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') }
    }
  })
  ```

- [ ] Create `src/test/setup.ts`:
  ```typescript
  import { expect, afterEach, vi } from 'vitest'
  import { cleanup } from '@testing-library/react'
  import * as matchers from '@testing-library/jest-dom/matchers'

  expect.extend(matchers)
  afterEach(() => cleanup())

  // Mock Supabase
  vi.mock('@/lib/supabase', () => ({ /* mock implementation */ }))
  ```

- [ ] Create `src/test/factories.ts`:
  ```typescript
  import { faker } from '@faker-js/faker'

  export const createMockBooking = (overrides = {}) => ({
    id: faker.string.uuid(),
    booking_date: faker.date.future().toISOString(),
    // ... other fields
    ...overrides
  })

  export const createMockCustomer = (overrides = {}) => ({ /* ... */ })
  export const createMockStaff = (overrides = {}) => ({ /* ... */ })
  ```

- [ ] Update `package.json`:
  ```json
  {
    "scripts": {
      "test": "vitest",
      "test:ui": "vitest --ui",
      "test:run": "vitest run",
      "test:coverage": "vitest run --coverage"
    }
  }
  ```

**Deliverable:** Complete test infrastructure ready

---

**Day 31-34: Critical Business Logic Tests (35 hours)**
```bash
Claude Skill: @testing-implementation
```

**Test Suite 1: `src/hooks/__tests__/use-staff-bookings.test.ts` (12 hours)**
Target Coverage: 85%

```typescript
describe('useStaffBookings', () => {
  describe('Booking Conflict Detection', () => {
    it('should detect overlapping bookings for same staff', () => {
      // Test: Two bookings for same staff at overlapping times
    })

    it('should allow bookings for different staff at same time', () => {
      // Test: Two bookings for different staff
    })

    it('should ignore cancelled bookings when checking conflicts', () => {
      // Test: Cancelled booking should not cause conflict
    })

    it('should detect team booking conflicts', () => {
      // Test: Team member availability
    })
  })

  describe('Staff Availability Calculation', () => {
    it('should calculate available time slots correctly', () => {
      // Test: Given bookings, calculate free slots
    })

    it('should respect staff working hours', () => {
      // Test: Don't allow bookings outside working hours
    })
  })

  describe('Earnings Calculation', () => {
    it('should calculate total earnings from completed bookings', () => {
      // Test: Sum of completed booking prices
    })

    it('should exclude cancelled and refunded bookings from earnings', () => {
      // Test: Filter out non-revenue bookings
    })
  })
})
```

**Test Suite 2: `src/hooks/__tests__/use-staff-availability-check.test.ts` (8 hours)**
Target Coverage: 90%

```typescript
describe('useStaffAvailabilityCheck', () => {
  describe('Time Window Validation', () => {
    it('should validate time format (HH:mm)', () => {})
    it('should reject invalid time ranges (end before start)', () => {})
    it('should validate minimum booking duration', () => {})
  })

  describe('Overlap Detection', () => {
    it('should detect exact time overlap', () => {})
    it('should detect partial overlap (start during existing)', () => {})
    it('should detect containment (new booking contains existing)', () => {})
  })
})
```

**Test Suite 3: `src/lib/__tests__/analytics.test.ts` (10 hours)**
Target Coverage: 90%

```typescript
describe('Analytics Calculations', () => {
  describe('Revenue Metrics', () => {
    it('should calculate total revenue from completed bookings', () => {
      const bookings = [
        createMockBooking({ status: 'completed', total_price: 1000 }),
        createMockBooking({ status: 'completed', total_price: 2000 }),
        createMockBooking({ status: 'cancelled', total_price: 1500 }),
      ]

      expect(calculateTotalRevenue(bookings)).toBe(3000)
    })

    it('should calculate revenue growth percentage', () => {})
    it('should calculate average order value', () => {})
  })

  describe('Booking Metrics', () => {
    it('should calculate completion rate', () => {})
    it('should calculate cancellation rate', () => {})
  })

  describe('Customer Metrics', () => {
    it('should calculate customer lifetime value', () => {})
    it('should segment customers by booking count', () => {})
  })

  describe('Date Range Calculations', () => {
    it('should filter bookings by date range preset (this-month)', () => {})
    it('should handle custom date ranges', () => {})
  })
})
```

**Test Suite 4: `src/lib/__tests__/export.test.ts` (5 hours)**
Target Coverage: 80%

```typescript
describe('Data Export', () => {
  describe('CSV Generation', () => {
    it('should convert data to CSV format', () => {})
    it('should escape special characters in CSV', () => {})
    it('should add UTF-8 BOM for Thai characters', () => {})
  })

  describe('Revenue Export', () => {
    it('should export revenue summary with correct columns', () => {})
    it('should filter by date range', () => {})
  })
})
```

**Deliverable:** 4 test suites, 85%+ coverage on critical business logic

---

**Week 6: Component & Hook Tests**

**Day 35-37: Component Tests (12 hours)**
```bash
Claude Skill: @testing-implementation
```

**Test Suite 5: `src/components/common/__tests__/StatusBadge.test.tsx` (2 hours)**
```typescript
describe('StatusBadge', () => {
  it('should render with correct variant color', () => {})
  it('should display status text', () => {})
  it('should apply custom className', () => {})
})
```

**Test Suite 6: `src/components/common/__tests__/StatCard.test.tsx` (3 hours)**
```typescript
describe('StatCard', () => {
  it('should display title and value', () => {})
  it('should show loading skeleton when isLoading', () => {})
  it('should display trend indicator with correct color', () => {})
  it('should call action.onClick when action button clicked', () => {})
})
```

**Test Suite 7: `src/components/booking/__tests__/BookingTable.test.tsx` (4 hours)**
```typescript
describe('BookingTable', () => {
  it('should render all bookings', () => {})
  it('should call onEdit when edit button clicked', () => {})
  it('should call onDelete when delete button clicked', () => {})
  it('should show empty state when no bookings', () => {})
})
```

**Test Suite 8: `src/components/booking/__tests__/BookingFormModal.test.tsx` (3 hours)**
```typescript
describe('BookingFormModal', () => {
  it('should render form fields', () => {})
  it('should show validation errors for required fields', () => {})
  it('should call onSubmit with form data when valid', () => {})
  it('should show conflict warning when conflicts detected', () => {})
})
```

**Deliverable:** Component test suites, 60%+ coverage on UI components

---

**Day 38-39: Hook Tests (7 hours)**
```bash
Claude Skill: @testing-implementation
```

**Test Suite 9: `src/hooks/__tests__/useBookingFilters.test.ts` (3 hours)**
```typescript
describe('useBookingFilters', () => {
  it('should initialize with default filters', () => {})
  it('should update filter values', () => {})
  it('should reset filters to default', () => {})
})
```

**Test Suite 10: `src/hooks/__tests__/useBookingForm.test.ts` (4 hours)**
```typescript
describe('useBookingForm', () => {
  it('should initialize with provided data', () => {})
  it('should validate required fields', () => {})
  it('should handle form submission', () => {})
  it('should show isSubmitting state during submission', () => {})
})
```

**Deliverable:** Hook test suites, 75%+ coverage on custom hooks

---

**Phase 5 Checkpoint:**
- ✅ Test infrastructure complete
- ✅ 10 test suites created
- ✅ 85%+ coverage on business logic
- ✅ 60%+ coverage on components
- ✅ 75%+ coverage on hooks
- ✅ Overall coverage: 75%+
- ✅ Safe to refactor with confidence

---

## 🎁 Quick Wins (High ROI, Low Effort)

Execute these in any order for immediate impact:

### Quick Win 1: Consolidate formatFullAddress (2 hours)
**Problem:** Duplicated in 2 files, used 13 times
**Solution:**
```typescript
// Create: src/lib/address-utils.ts
export function formatFullAddress(address: AddressFields): string { /* ... */ }

// Update 13 imports
import { formatFullAddress } from '@/lib/address-utils'
```
**Impact:** DRY principle, easier maintenance
**ROI:** High

---

### Quick Win 2: Create StatusBadge Component (4 hours)
**Problem:** 10+ inline badge patterns with identical styling
**Solution:** See Phase 1, Day 1-2
**Impact:** Consistency across app, 200+ lines removed
**ROI:** Very High

---

### Quick Win 3: Add useCallback to Handlers (6 hours)
**Problem:** bookings.tsx handlers cause unnecessary re-renders
**Solution:**
```typescript
const handleEdit = useCallback((booking) => { /* ... */ }, [])
const handleDelete = useCallback((id) => { /* ... */ }, [refetch])
```
**Impact:** 10-15% performance improvement
**ROI:** High

---

### Quick Win 4: Consolidate Booking Interfaces (3 hours)
**Problem:** Booking interface defined in 3+ files
**Solution:**
```typescript
// Create: src/types/booking.ts
export interface Booking { /* ... */ }

// Remove from: bookings.tsx, calendar.tsx, use-staff-bookings.ts
```
**Impact:** Single source of truth, better type safety
**ROI:** High

---

### Quick Win 5: Create EmptyState Component (3 hours)
**Problem:** Inconsistent empty states in 8+ pages
**Solution:** See Phase 1, Day 4
**Impact:** UX consistency, clearer CTAs
**ROI:** High

---

**Total Quick Wins: 18 hours (~2-3 days)**

**Cumulative Impact:**
- Remove ~300 lines of duplicated code
- Improve type safety
- 10-15% performance gain
- Better UX consistency

---

## 📊 Success Metrics & KPIs

### Code Quality Metrics

**Before Implementation:**
- Average component size: 680 lines
- Largest file: 2,400 lines (bookings.tsx)
- Code duplication: High (10+ repeated patterns)
- Test coverage: 0%

**After Implementation Targets:**
- Average component size: 200 lines (70% reduction)
- Largest file: <500 lines
- Code duplication: Low (shared component library)
- Test coverage: 75%+ overall

### Performance Metrics

**Measure with React DevTools Profiler:**
- Component render time: Target <16ms (60fps)
- List scrolling: 60fps smooth
- Chart rendering: <500ms
- Search/filter response: <300ms

**Bundle Size:**
- Current: ~1.49MB JS
- Target: <1.30MB (10-15% reduction)

### Developer Experience Metrics

- Time to locate code: 50% faster (smaller files)
- Onboarding time: 30% faster (better organization)
- Bug fix time: 40% faster (isolated components, tests)

---

## ⚠️ Risk Assessment & Mitigation

### High Risk Areas

#### Risk 1: Breaking Booking System During Refactor
**Impact:** Critical - Core business function
**Probability:** Medium
**Mitigation:**
- Start with component library (non-breaking additions)
- Implement comprehensive tests BEFORE refactoring
- Refactor incrementally with feature flags
- Test thoroughly in staging environment
- Keep original code in git history for rollback

---

#### Risk 2: Supabase Realtime Subscriptions Break
**Impact:** High - Affects live updates
**Probability:** Low
**Mitigation:**
- Document all subscription patterns before refactoring
- Test realtime updates after each component extraction
- Maintain same subscription lifecycle (useEffect patterns)

---

#### Risk 3: Performance Regression from Over-Memoization
**Impact:** Medium - Could make performance worse
**Probability:** Low
**Mitigation:**
- Use React DevTools Profiler to measure before/after
- Only memoize components with expensive renders
- Avoid premature optimization
- Profile in production-like data volumes

---

#### Risk 4: Type Errors After Consolidation
**Impact:** Medium - Build failures
**Probability:** Low
**Mitigation:**
- Run `npm run build` after each type consolidation step
- Use TypeScript's "Find All References" before moving types
- Update imports with automated IDE refactoring
- Enable strict mode to catch issues early

---

### Medium Risk Areas

#### Risk 5: Test Implementation Taking Longer Than Expected
**Impact:** Medium - Delays timeline
**Probability:** Medium
**Mitigation:**
- Start with most critical business logic
- Use test factories for faster test writing
- Focus on high-value tests (business logic > UI)
- Consider pairing/reviewing to maintain quality

---

## 📋 Execution Checklist

### Pre-Implementation
- [ ] Back up current codebase to separate branch
- [ ] Create feature branch: `feature/skills-implementation`
- [ ] Set up project tracking (GitHub Projects/Issues)
- [ ] Schedule code review checkpoints
- [ ] Communicate timeline to stakeholders

### Phase 1: Foundation
- [ ] Install component library dependencies
- [ ] Create `src/components/common/` directory
- [ ] Create StatusBadge component
- [ ] Create StatCard component
- [ ] Create ConfirmDialog component
- [ ] Create EmptyState component
- [ ] Create DataTableFilters component
- [ ] Create `src/types/` directory structure
- [ ] Consolidate Booking types
- [ ] Consolidate Customer types
- [ ] Consolidate Staff types
- [ ] Create address-utils.ts
- [ ] Create status-utils.ts
- [ ] Run tests (none yet, but verify build)
- [ ] Git commit: "feat: add component library and consolidated types"

### Phase 2: Refactoring
- [ ] Create useBookingFilters hook
- [ ] Create useBookingForm hook
- [ ] Create useConflictDetection hook
- [ ] Create useBookingPagination hook
- [ ] Extract BookingFiltersPanel component
- [ ] Extract BookingTable component
- [ ] Extract BookingFormModal component
- [ ] Extract ConflictDetectionPanel component
- [ ] Extract BulkActionsToolbar component
- [ ] Update bookings.tsx to use extracted components
- [ ] Test bookings page thoroughly
- [ ] Git commit: "refactor: decompose bookings.tsx into focused components"
- [ ] Create useCustomerProfile hook
- [ ] Create useCustomerBookings hook
- [ ] Extract CustomerProfileHeader component
- [ ] Extract CustomerBookingHistory component
- [ ] Extract CustomerStatsPanel component
- [ ] Update customer-detail.tsx
- [ ] Test customer detail page
- [ ] Git commit: "refactor: decompose customer-detail.tsx"

### Phase 3: Performance
- [ ] Add React.memo to 20+ components
- [ ] Add useCallback to 30+ handlers
- [ ] Add useMemo to 15+ calculations
- [ ] Run React DevTools Profiler before/after
- [ ] Document performance improvements
- [ ] Git commit: "perf: add memoization to components and handlers"

### Phase 4: Architecture
- [ ] Create useReportData hook
- [ ] Extract RevenueAnalyticsSection component
- [ ] Extract CustomerAnalyticsSection component
- [ ] Extract StaffAnalyticsSection component
- [ ] Extract TeamAnalyticsSection component
- [ ] Update reports.tsx
- [ ] Test all report tabs
- [ ] Git commit: "refactor: decompose reports.tsx"
- [ ] Refactor remaining 500+ line files
- [ ] Git commit: "refactor: complete large file decomposition"

### Phase 5: Testing
- [ ] Install testing dependencies
- [ ] Create vitest.config.ts
- [ ] Create test setup file
- [ ] Create test factories
- [ ] Write use-staff-bookings tests
- [ ] Write use-staff-availability-check tests
- [ ] Write analytics tests
- [ ] Write export tests
- [ ] Write component tests
- [ ] Write hook tests
- [ ] Run coverage report
- [ ] Verify 75%+ coverage
- [ ] Git commit: "test: add comprehensive test coverage"

### Post-Implementation
- [ ] Run full test suite
- [ ] Run linter (npm run lint)
- [ ] Run build (npm run build)
- [ ] Test in staging environment
- [ ] Performance audit with Lighthouse
- [ ] Code review with team
- [ ] Update documentation
- [ ] Merge to main branch
- [ ] Deploy to production
- [ ] Monitor for errors

---

## 📞 Support & Resources

### Claude Skills Reference
- `@code-review-refactoring` - Large component decomposition
- `@testing-implementation` - Test setup and writing
- `@typescript-best-practices` - Type consolidation
- `@performance-optimization` - Memoization and optimization
- `@component-library-generator` - Shared component creation

### Documentation
- Skill files located in `.claude/skills/`
- Each skill has detailed instructions and examples
- Refer to skills before starting each phase

### Getting Help
If stuck on any task:
1. Re-read the relevant Claude Skill documentation
2. Use the skill with `@skill-name` to get AI guidance
3. Review similar code in codebase for patterns
4. Consult React/TypeScript documentation
5. Ask for code review from team

---

## 🎯 Next Steps

### Immediate Actions (This Week)
1. **Review this roadmap** with development team
2. **Approve or adjust** timeline and priorities
3. **Create project tracking board** (GitHub Projects)
4. **Set up monitoring** (React DevTools, Lighthouse)
5. **Begin Phase 1** - Component Library Creation

### Questions to Decide
- [ ] Who will be the primary developer executing this plan?
- [ ] Should we execute all phases or prioritize certain ones?
- [ ] What is the acceptable deadline (5 weeks realistic?)
- [ ] Should we do incremental releases or complete all phases first?
- [ ] Do we need staging environment testing at each checkpoint?

---

**Ready to begin?** Start with Quick Wins or jump directly to Phase 1! 🚀

---

**Document Version:** 1.0
**Last Updated:** 2025-10-24
**Estimated Completion:** 5-7 weeks
**Total Effort:** 215 hours
**Status:** Awaiting approval to proceed
