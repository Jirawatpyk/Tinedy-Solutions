# 📋 Sprint 2 - Filter & Search UX Improvements Checklist

## 🎯 Project Overview
**Goal:** Replace old filter system with modern, flexible multi-select filters + search
**Timeline:** 14 days (~3 weeks)
**Status:** 🟡 In Progress

---

## ✅ Pre-Development Checklist

### Design Decisions (APPROVED)
- [x] Filter Presets: Today, Week, Month, Upcoming, Pending, Confirmed
- [x] Mobile UX: Bottom Sheet
- [x] Search Fields: Customer, Phone, Service, Staff, Team, Booking ID
- [x] View Mode: REMOVE (use filters instead)
- [x] Persistence: localStorage

### Setup
- [ ] Create `src/components/calendar/filters/` folder
- [ ] Create `src/types/calendar-filters.ts` file
- [ ] Backup current calendar.tsx (Lines 50-53, 679-780)

---

## 📁 Phase 1: Foundation (Day 1-2)

### Day 1: Types & Hook Foundation
- [ ] **File: `src/types/calendar-filters.ts`**
  - [ ] Define `CalendarFilters` interface
  - [ ] Define `CalendarFilterAction` type
  - [ ] Define `INITIAL_CALENDAR_FILTERS` constant
  - [ ] Export all types

- [ ] **File: `src/hooks/useCalendarFilters.ts`** (Part 1)
  - [ ] Create `calendarFiltersReducer` function
  - [ ] Implement all action handlers:
    - [ ] `SET_DATE_RANGE`
    - [ ] `TOGGLE_STAFF`
    - [ ] `TOGGLE_TEAM`
    - [ ] `TOGGLE_STATUS`
    - [ ] `SET_SEARCH`
    - [ ] `SET_PRESET`
    - [ ] `CLEAR_ALL`
    - [ ] `CLEAR_DATE_RANGE`
    - [ ] `CLEAR_STAFF`
    - [ ] `CLEAR_TEAM`
    - [ ] `CLEAR_STATUS`

### Day 2: Hook Completion & Folder Setup
- [ ] **File: `src/hooks/useCalendarFilters.ts`** (Part 2)
  - [ ] Create preset logic function (`applyPreset`)
  - [ ] Implement `useCalendarFilters` hook
  - [ ] Add localStorage persistence (load on mount)
  - [ ] Add computed values:
    - [ ] `hasActiveFilters`
    - [ ] `activeFilterCount`
  - [ ] Export hook

- [ ] **Create folder structure:**
  ```
  src/components/calendar/filters/
  └── (ready for components)
  ```

- [ ] **Test Hook:**
  - [ ] Test in browser console
  - [ ] Verify reducer actions work
  - [ ] Verify localStorage save/load

---

## 🧩 Phase 2: Core Filter Components (Day 3-5)

### Day 3: FilterMultiSelect
- [ ] **File: `src/components/calendar/filters/FilterMultiSelect.tsx`**
  - [ ] Create component interface (`FilterMultiSelectProps`)
  - [ ] Implement UI:
    - [ ] Header with label + icon
    - [ ] "Select All" checkbox (with indeterminate state)
    - [ ] ScrollArea for options list
    - [ ] Individual checkboxes for each option
    - [ ] Selected count display
    - [ ] Clear button
  - [ ] Add Shadcn UI components:
    - [ ] Checkbox
    - [ ] Label
    - [ ] ScrollArea
  - [ ] Export component

- [ ] **Test FilterMultiSelect:**
  - [ ] Render with sample data
  - [ ] Test Select All
  - [ ] Test individual toggle
  - [ ] Test Clear button

### Day 4: FilterDateRangePicker & FilterSearchBar
- [ ] **File: `src/components/calendar/filters/FilterDateRangePicker.tsx`**
  - [ ] Create component with date range state
  - [ ] Implement Popover + Calendar (react-day-picker)
  - [ ] Add "Clear Date Range" button
  - [ ] Format date display (MMM dd, yyyy)
  - [ ] Auto-apply when both dates selected
  - [ ] Export component

- [ ] **File: `src/components/calendar/filters/FilterSearchBar.tsx`**
  - [ ] Create search input component
  - [ ] Add Search icon
  - [ ] Implement debounce (300ms)
  - [ ] Add clear button (X icon)
  - [ ] Placeholder text
  - [ ] Export component

- [ ] **Test Both Components:**
  - [ ] Date picker opens/closes correctly
  - [ ] Date range selection works
  - [ ] Search debounce works (300ms delay)
  - [ ] Clear buttons work

### Day 5: FilterBadge & FilterPresets
- [ ] **File: `src/components/calendar/filters/FilterBadge.tsx`**
  - [ ] Create badge component
  - [ ] Add icon slot
  - [ ] Add remove button (X)
  - [ ] Style with Tailwind (primary/10 bg)
  - [ ] Export component

- [ ] **File: `src/components/calendar/filters/FilterPresets.tsx`**
  - [ ] Create presets array:
    - [ ] Today
    - [ ] This Week
    - [ ] This Month
    - [ ] Upcoming
    - [ ] Pending Only
    - [ ] Confirmed Only
  - [ ] Implement preset buttons
  - [ ] Add active state styling
  - [ ] Add icons for each preset
  - [ ] Export component

- [ ] **Test Components:**
  - [ ] Badge renders correctly
  - [ ] Remove callback works
  - [ ] Presets render in horizontal scroll
  - [ ] Active preset highlighted

---

## 🎨 Phase 3: Container Components (Day 6-7)

### Day 6: CalendarFiltersDesktop
- [ ] **File: `src/components/calendar/filters/CalendarFiltersDesktop.tsx`**
  - [ ] Create desktop layout component
  - [ ] **Row 1:** Search Bar + Advanced Filters Button
    - [ ] FilterSearchBar component
    - [ ] Popover trigger button (with filter count badge)
  - [ ] **Popover Content:**
    - [ ] FilterDateRangePicker
    - [ ] FilterMultiSelect (Staff)
    - [ ] FilterMultiSelect (Teams)
    - [ ] FilterMultiSelect (Status)
    - [ ] Clear All button
  - [ ] **Row 2:** FilterPresets
  - [ ] **Row 3:** Active Filter Badges
    - [ ] Map dateRange to badge
    - [ ] Map staffIds to badges
    - [ ] Map teamIds to badges
    - [ ] Map statuses to badges
    - [ ] Clear All button
  - [ ] Export component

- [ ] **Test Desktop Component:**
  - [ ] Popover opens/closes
  - [ ] All filters render inside popover
  - [ ] Badges display correctly
  - [ ] Clear All works

### Day 7: CalendarFiltersMobile & Main Container
- [ ] **File: `src/components/calendar/filters/CalendarFiltersMobile.tsx`**
  - [ ] Create mobile layout with Sheet (bottom drawer)
  - [ ] Sheet trigger button (Filter icon + count badge)
  - [ ] **Sheet Content:**
    - [ ] FilterSearchBar
    - [ ] FilterDateRangePicker
    - [ ] FilterMultiSelect (Staff)
    - [ ] FilterMultiSelect (Teams)
    - [ ] FilterMultiSelect (Status)
    - [ ] Apply Filters button (closes sheet)
    - [ ] Clear All button
  - [ ] Export component

- [ ] **File: `src/components/calendar/filters/CalendarFilters.tsx`**
  - [ ] Create main adaptive container
  - [ ] Use `useMediaQuery` or CSS to switch:
    - [ ] Desktop (≥ 1024px): CalendarFiltersDesktop
    - [ ] Mobile (< 1024px): CalendarFiltersMobile
  - [ ] Pass all props to child components
  - [ ] Export component

- [ ] **Test Both Components:**
  - [ ] Mobile sheet opens from bottom
  - [ ] Desktop/Mobile switching works
  - [ ] All props passed correctly

---

## 🔗 Phase 4: Integration (Day 8-9)

### Day 8: Remove Old Filters
- [ ] **File: `src/pages/admin/calendar.tsx`**
  - [ ] **REMOVE Lines 50-53:**
    ```typescript
    const [selectedTeam, setSelectedTeam] = useState<string>('all')
    const [selectedStaff, setSelectedStaff] = useState<string>('all')
    const [selectedStatus, setSelectedStatus] = useState<string>('all')
    const [viewMode, setViewMode] = useState<'staff' | 'team' | 'all'>('all')
    ```

  - [ ] **REMOVE Lines 679-780 (entire old filter Card):**
    - View Mode buttons
    - Staff dropdown
    - Team dropdown
    - Status dropdown

  - [ ] **Save backup** of removed code (just in case)

- [ ] **Add Imports:**
  - [ ] `import { CalendarFilters } from '@/components/calendar/filters/CalendarFilters'`
  - [ ] `import { useCalendarFilters } from '@/hooks/useCalendarFilters'`
  - [ ] `import type { CalendarFilters as CalendarFiltersType } from '@/types/calendar-filters'`

### Day 9: Integrate New Filters
- [ ] **File: `src/pages/admin/calendar.tsx`**
  - [ ] Add `useCalendarFilters` hook call
  - [ ] Destructure all actions and state
  - [ ] **Replace old filter UI with:**
    ```tsx
    <CalendarFilters
      filters={filters}
      staffList={staffList}
      teamsList={teams}
      onSetDateRange={setDateRange}
      onToggleStaff={toggleStaff}
      onToggleTeam={toggleTeam}
      onToggleStatus={toggleStatus}
      onSetSearch={setSearch}
      onSetPreset={setPreset}
      onClearAll={clearAll}
      onClearDateRange={clearDateRange}
      onClearStaff={clearStaff}
      onClearTeam={clearTeam}
      onClearStatus={clearStatus}
      hasActiveFilters={hasActiveFilters}
      activeFilterCount={activeFilterCount}
    />
    ```

  - [ ] **Update `useBookingsByDateRange` filters:**
    ```typescript
    filters: {
      staffIds: filters.staffIds,      // Array
      teamIds: filters.teamIds,        // Array
      statuses: filters.statuses,      // Array
      searchQuery: filters.searchQuery // String
    }
    ```

- [ ] **Test Integration:**
  - [ ] Page loads without errors
  - [ ] New filters render correctly
  - [ ] No console errors

---

## 🔍 Phase 5: Search Implementation (Day 10)

### Day 10: Update Booking Queries
- [ ] **File: `src/lib/queries/booking-queries.ts`**
  - [ ] Update `BookingFilters` interface:
    - [ ] Change `staffId?: string` to `staffIds?: string[]`
    - [ ] Change `teamId?: string` to `teamIds?: string[]`
    - [ ] Change `status?: string` to `statuses?: string[]`
    - [ ] Add `searchQuery?: string`

  - [ ] Update `fetchBookingsByDateRange` function:
    - [ ] **Staff filter:** `query.in('staff_id', filters.staffIds)`
    - [ ] **Team filter:** `query.in('team_id', filters.teamIds)`
    - [ ] **Status filter:** `query.in('status', filters.statuses)`
    - [ ] **Search filter (client-side):**
      ```typescript
      if (filters?.searchQuery && data) {
        const query = filters.searchQuery.toLowerCase()
        return data.filter(booking => {
          return (
            booking.customers?.full_name?.toLowerCase().includes(query) ||
            booking.customers?.phone?.toLowerCase().includes(query) ||
            booking.service_packages?.name?.toLowerCase().includes(query) ||
            booking.profiles?.full_name?.toLowerCase().includes(query) ||
            booking.teams?.name?.toLowerCase().includes(query) ||
            booking.id.toLowerCase().includes(query)
          )
        })
      }
      ```

- [ ] **Test Search:**
  - [ ] Search by customer name works
  - [ ] Search by phone works
  - [ ] Search by service name works
  - [ ] Search by booking ID works
  - [ ] Debounce works (300ms)

---

## 💾 Phase 6: Filter Persistence (Day 11)

### Day 11: LocalStorage Implementation
- [ ] **File: `src/hooks/useCalendarFilters.ts`**
  - [ ] Add localStorage load on mount:
    ```typescript
    const [filters, dispatch] = useReducer(
      calendarFiltersReducer,
      initialFilters,
      (initial) => {
        const stored = localStorage.getItem('calendar-filters')
        if (stored) {
          const parsed = JSON.parse(stored)
          // Convert date strings to Date objects
          if (parsed.dateRange) {
            parsed.dateRange = {
              start: new Date(parsed.dateRange.start),
              end: new Date(parsed.dateRange.end)
            }
          }
          return parsed
        }
        return initial
      }
    )
    ```

  - [ ] Add localStorage save on change:
    ```typescript
    useEffect(() => {
      const timeout = setTimeout(() => {
        localStorage.setItem('calendar-filters', JSON.stringify(filters))
      }, 500) // Debounce writes
      return () => clearTimeout(timeout)
    }, [filters])
    ```

- [ ] **Test Persistence:**
  - [ ] Apply filters
  - [ ] Refresh page
  - [ ] Verify filters restored
  - [ ] Test date range serialization

---

## 🧪 Phase 7: Testing & Polish (Day 12-14)

### Day 12: Unit Tests
- [ ] **Test: `useCalendarFilters.test.ts`**
  - [ ] Test reducer actions
  - [ ] Test preset application
  - [ ] Test active filter count
  - [ ] Test localStorage persistence

- [ ] **Test: `FilterMultiSelect.test.tsx`**
  - [ ] Test rendering
  - [ ] Test Select All
  - [ ] Test individual toggle
  - [ ] Test Clear

### Day 13: Integration Tests
- [ ] **Test filters + booking fetch:**
  - [ ] Apply staff filter → verify bookings filtered
  - [ ] Apply status filter → verify bookings filtered
  - [ ] Apply search → verify results filtered
  - [ ] Apply date range → verify date filtering

- [ ] **Test responsive behavior:**
  - [ ] Desktop view (≥ 1024px)
  - [ ] Mobile view (< 1024px)
  - [ ] Sheet opens on mobile
  - [ ] Popover opens on desktop

### Day 14: Final Polish & Build
- [ ] **Performance Optimization:**
  - [ ] Verify debounce working (search, localStorage)
  - [ ] Check for unnecessary re-renders
  - [ ] Memoize filter options
  - [ ] Test with 1000+ bookings

- [ ] **UI Polish:**
  - [ ] Check spacing/alignment
  - [ ] Verify icon sizes
  - [ ] Test badge removals
  - [ ] Check mobile scroll behavior

- [ ] **Build & Deploy:**
  - [ ] Run `npm run build`
  - [ ] Fix any build errors
  - [ ] Test production build
  - [ ] Verify no TypeScript errors

---

## 📊 Success Criteria

### Functionality
- [ ] All old filters removed
- [ ] New filters work correctly
- [ ] Multi-select works (Staff, Team, Status)
- [ ] Date range picker works
- [ ] Search works (6 fields)
- [ ] Filter badges show/remove correctly
- [ ] Presets apply correctly
- [ ] Clear All resets everything
- [ ] Filters persist across page reload

### Performance
- [ ] No increase in page load time
- [ ] Search debounced (300ms)
- [ ] localStorage writes debounced (500ms)
- [ ] No unnecessary re-renders
- [ ] Handles 1000+ bookings

### UX
- [ ] Desktop: Search + Popover works smoothly
- [ ] Mobile: Bottom Sheet works smoothly
- [ ] Active filters clearly visible
- [ ] Quick presets easy to use
- [ ] No UI glitches or bugs

### Cross-Browser/Device
- [ ] Chrome (Desktop/Mobile)
- [ ] Firefox (Desktop)
- [ ] Safari (macOS/iOS)
- [ ] Edge (Desktop)

---

## 🚨 Known Issues / Blockers
*Document any issues found during development here*

- [ ] None yet

---

## 📝 Notes
- Backup old filter code: [Lines 50-53, 679-780]
- localStorage key: `'calendar-filters'`
- Debounce delays: Search (300ms), localStorage (500ms)
- Mobile breakpoint: 1024px (lg:)

---

## ✅ Final Checklist Before Commit

- [ ] All files created and exported
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Build succeeds (`npm run build`)
- [ ] Old filter code completely removed
- [ ] New filters working on desktop
- [ ] New filters working on mobile
- [ ] Filters persist correctly
- [ ] Code reviewed
- [ ] Ready to commit

---

**Status:** 🟡 Ready to Begin
**Start Date:** _____
**Estimated Completion:** _____ (14 days from start)
