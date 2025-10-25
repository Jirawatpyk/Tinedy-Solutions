# Performance Optimization Skill

## Purpose
Optimize React application performance in Tinedy CRM by identifying and resolving performance bottlenecks. Focus on reducing unnecessary re-renders, optimizing data fetching, improving bundle size, and ensuring smooth user experience even with large datasets.

## When to Use
- Application feels slow or laggy
- Large datasets causing performance issues
- Unnecessary re-renders detected
- Bundle size is too large (>1MB)
- Initial load time is slow (>3 seconds)
- Memory leaks detected
- Real-time updates causing performance degradation
- Charts and analytics are slow to render

## Scope
This skill focuses on:
1. **React Performance** - Memoization, lazy loading, virtualization
2. **Data Fetching** - Query optimization, caching, parallel requests
3. **Bundle Optimization** - Code splitting, tree shaking, lazy imports
4. **Rendering Performance** - Reducing re-renders, optimizing reconciliation
5. **Memory Management** - Preventing leaks, efficient data structures
6. **Network Performance** - Request batching, prefetching, compression

## Performance Audit Process

### Step 1: Identify Performance Issues

#### 1.1 Use React DevTools Profiler
```bash
# Install React DevTools browser extension
# Profile the application during typical usage
# Look for:
# - Components with long render times
# - Components that re-render frequently
# - Components with unnecessary re-renders
```

#### 1.2 Use Lighthouse Audit
```bash
# Run Lighthouse in Chrome DevTools
# Check scores for:
# - Performance (should be >90)
# - First Contentful Paint (should be <1.8s)
# - Largest Contentful Paint (should be <2.5s)
# - Time to Interactive (should be <3.8s)
# - Total Blocking Time (should be <200ms)
```

#### 1.3 Analyze Bundle Size
```bash
npm run build

# Install bundle analyzer
npm install -D rollup-plugin-visualizer

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true, filename: 'stats.html' })
  ]
})
```

### Step 2: Prioritize Optimizations

**Priority 1: User-Facing Performance** (Most Impact)
- Slow page loads
- Laggy interactions
- Slow list rendering
- Chart rendering delays

**Priority 2: Developer Experience**
- Slow build times
- Large bundle sizes
- Unnecessary re-renders in development

**Priority 3: Future-Proofing**
- Memory leak prevention
- Scalability for large datasets
- Code splitting for future features

## Performance Optimization Techniques

### 1. React Component Optimization

#### 1.1 Use React.memo for Pure Components

❌ **Before (Re-renders on every parent update):**
```typescript
export const BookingCard = ({ booking }: { booking: Booking }) => {
  return (
    <Card>
      <h3>{booking.customer.full_name}</h3>
      <p>{formatDate(booking.booking_date)}</p>
    </Card>
  )
}
```

✅ **After (Only re-renders when booking changes):**
```typescript
export const BookingCard = React.memo(
  ({ booking }: { booking: Booking }) => {
    return (
      <Card>
        <h3>{booking.customer.full_name}</h3>
        <p>{formatDate(booking.booking_date)}</p>
      </Card>
    )
  },
  (prevProps, nextProps) => {
    // Custom comparison function
    return prevProps.booking.id === nextProps.booking.id &&
           prevProps.booking.updated_at === nextProps.booking.updated_at
  }
)

BookingCard.displayName = 'BookingCard'
```

#### 1.2 Use useMemo for Expensive Calculations

❌ **Before (Recalculates on every render):**
```typescript
const BookingsPage = ({ bookings }: { bookings: Booking[] }) => {
  const stats = calculateBookingStats(bookings) // Expensive!
  const topCustomers = getTopCustomers(bookings, 10) // Expensive!

  return (
    <div>
      <StatsCards stats={stats} />
      <TopCustomersList customers={topCustomers} />
    </div>
  )
}
```

✅ **After (Only recalculates when bookings change):**
```typescript
const BookingsPage = ({ bookings }: { bookings: Booking[] }) => {
  const stats = useMemo(
    () => calculateBookingStats(bookings),
    [bookings]
  )

  const topCustomers = useMemo(
    () => getTopCustomers(bookings, 10),
    [bookings]
  )

  return (
    <div>
      <StatsCards stats={stats} />
      <TopCustomersList customers={topCustomers} />
    </div>
  )
}
```

#### 1.3 Use useCallback for Function Props

❌ **Before (New function on every render):**
```typescript
const BookingsPage = () => {
  const [bookings, setBookings] = useState<Booking[]>([])

  const handleEdit = (booking: Booking) => {
    // Open edit modal
  }

  const handleDelete = (id: string) => {
    // Delete booking
  }

  return (
    <BookingTable
      bookings={bookings}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  )
}
```

✅ **After (Stable function references):**
```typescript
const BookingsPage = () => {
  const [bookings, setBookings] = useState<Booking[]>([])

  const handleEdit = useCallback((booking: Booking) => {
    // Open edit modal
  }, [])

  const handleDelete = useCallback((id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id))
  }, [])

  return (
    <BookingTable
      bookings={bookings}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  )
}
```

### 2. List Virtualization for Large Datasets

#### 2.1 Install react-window
```bash
npm install react-window
npm install -D @types/react-window
```

#### 2.2 Implement Virtual List

❌ **Before (Renders all 1000+ items):**
```typescript
const BookingList = ({ bookings }: { bookings: Booking[] }) => {
  return (
    <div className="space-y-2">
      {bookings.map(booking => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
    </div>
  )
}
```

✅ **After (Only renders visible items):**
```typescript
import { FixedSizeList } from 'react-window'

const BookingList = ({ bookings }: { bookings: Booking[] }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <BookingCard booking={bookings[index]} />
    </div>
  )

  return (
    <FixedSizeList
      height={600}
      itemCount={bookings.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  )
}
```

### 3. Code Splitting and Lazy Loading

#### 3.1 Lazy Load Routes

❌ **Before (All pages loaded upfront):**
```typescript
import Dashboard from './pages/admin/dashboard'
import Bookings from './pages/admin/bookings'
import Customers from './pages/admin/customers'
import Reports from './pages/admin/reports'

const App = () => (
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/bookings" element={<Bookings />} />
    <Route path="/customers" element={<Customers />} />
    <Route path="/reports" element={<Reports />} />
  </Routes>
)
```

✅ **After (Pages loaded on-demand):**
```typescript
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/admin/dashboard'))
const Bookings = lazy(() => import('./pages/admin/bookings'))
const Customers = lazy(() => import('./pages/admin/customers'))
const Reports = lazy(() => import('./pages/admin/reports'))

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
  </div>
)

const App = () => (
  <Suspense fallback={<LoadingFallback />}>
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/bookings" element={<Bookings />} />
      <Route path="/customers" element={<Customers />} />
      <Route path="/reports" element={<Reports />} />
    </Routes>
  </Suspense>
)
```

#### 3.2 Lazy Load Heavy Components

```typescript
// Lazy load chart library only when needed
const RechartsChart = lazy(() => import('./components/RechartsChart'))

const Reports = () => {
  const [showCharts, setShowCharts] = useState(false)

  return (
    <div>
      <Button onClick={() => setShowCharts(true)}>Show Analytics</Button>

      {showCharts && (
        <Suspense fallback={<ChartSkeleton />}>
          <RechartsChart data={data} />
        </Suspense>
      )}
    </div>
  )
}
```

### 4. Data Fetching Optimization

#### 4.1 Parallel Queries with Promise.all

❌ **Before (Sequential - slow):**
```typescript
const fetchDashboardData = async () => {
  const bookings = await fetchBookings()
  const customers = await fetchCustomers()
  const staff = await fetchStaff()
  const teams = await fetchTeams()

  return { bookings, customers, staff, teams }
}
```

✅ **After (Parallel - fast):**
```typescript
const fetchDashboardData = async () => {
  const [bookings, customers, staff, teams] = await Promise.all([
    fetchBookings(),
    fetchCustomers(),
    fetchStaff(),
    fetchTeams()
  ])

  return { bookings, customers, staff, teams }
}
```

#### 4.2 Implement Data Caching

```typescript
// Simple cache implementation
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const fetchWithCache = async <T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> => {
  const cached = cache.get(key)

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as T
  }

  const data = await fetcher()
  cache.set(key, { data, timestamp: Date.now() })

  return data
}

// Usage
const bookings = await fetchWithCache(
  'bookings-this-month',
  () => supabase.from('bookings').select('*')
)
```

#### 4.3 Optimize Supabase Queries

❌ **Before (Fetches all data, filters client-side):**
```typescript
const { data: bookings } = await supabase
  .from('bookings')
  .select('*, customer(*), staff(*), service_packages(*)')

const confirmedBookings = bookings?.filter(b => b.status === 'confirmed')
const thisMonthBookings = bookings?.filter(b => isThisMonth(b.booking_date))
```

✅ **After (Filters server-side):**
```typescript
// Only fetch what you need
const { data: confirmedBookings } = await supabase
  .from('bookings')
  .select('*, customer(id, full_name), service_packages(id, name)')
  .eq('status', 'confirmed')
  .gte('booking_date', startOfMonth(new Date()).toISOString())
  .lte('booking_date', endOfMonth(new Date()).toISOString())
```

#### 4.4 Use Supabase Realtime Wisely

❌ **Before (Subscribe to everything):**
```typescript
useEffect(() => {
  const subscription = supabase
    .channel('all-bookings')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'bookings'
    }, () => {
      refetchAllBookings() // Expensive!
    })
    .subscribe()

  return () => subscription.unsubscribe()
}, [])
```

✅ **After (Subscribe only to relevant changes):**
```typescript
useEffect(() => {
  // Only subscribe to bookings for current staff
  const subscription = supabase
    .channel(`staff-bookings-${staffId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'bookings',
      filter: `staff_id=eq.${staffId}`
    }, (payload) => {
      // Optimistic update instead of refetch
      setBookings(prev => {
        if (payload.eventType === 'INSERT') {
          return [...prev, payload.new]
        }
        if (payload.eventType === 'UPDATE') {
          return prev.map(b => b.id === payload.new.id ? payload.new : b)
        }
        if (payload.eventType === 'DELETE') {
          return prev.filter(b => b.id !== payload.old.id)
        }
        return prev
      })
    })
    .subscribe()

  return () => subscription.unsubscribe()
}, [staffId])
```

### 5. Chart Performance Optimization

#### 5.1 Debounce Chart Updates

```typescript
import { useDebouncedValue } from '@/hooks/use-debounced-value'

const RevenueChart = ({ bookings }: { bookings: Booking[] }) => {
  // Debounce data updates to prevent frequent re-renders
  const debouncedBookings = useDebouncedValue(bookings, 300)

  const chartData = useMemo(
    () => prepareChartData(debouncedBookings),
    [debouncedBookings]
  )

  return <LineChart data={chartData} />
}
```

#### 5.2 Sample Large Datasets

```typescript
const prepareChartData = (bookings: Booking[]) => {
  // If too many data points, sample them
  const MAX_POINTS = 100

  if (bookings.length <= MAX_POINTS) {
    return bookings.map(formatForChart)
  }

  // Take every Nth item to reduce to MAX_POINTS
  const step = Math.ceil(bookings.length / MAX_POINTS)
  return bookings
    .filter((_, index) => index % step === 0)
    .map(formatForChart)
}
```

### 6. Image and Asset Optimization

#### 6.1 Lazy Load Images

```typescript
const CustomerAvatar = ({ src, alt }: { src: string; alt: string }) => {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="w-10 h-10 rounded-full"
    />
  )
}
```

#### 6.2 Use Modern Image Formats

```typescript
// In vite.config.ts
import imagemin from 'vite-plugin-imagemin'

export default defineConfig({
  plugins: [
    react(),
    imagemin({
      gifsicle: { optimizationLevel: 7 },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      svgo: { plugins: [{ removeViewBox: false }] }
    })
  ]
})
```

### 7. Bundle Size Optimization

#### 7.1 Analyze and Remove Unused Dependencies

```bash
# Check bundle size
npm run build

# Find unused dependencies
npx depcheck

# Remove unused packages
npm uninstall package-name
```

#### 7.2 Use Smaller Alternatives

```typescript
// Instead of moment.js (large)
import moment from 'moment' // ❌ 67KB minified

// Use date-fns (small, tree-shakeable)
import { format, parseISO } from 'date-fns' // ✅ 2KB per function

// Instead of lodash (large)
import _ from 'lodash' // ❌ 72KB minified

// Use lodash-es with tree-shaking
import debounce from 'lodash-es/debounce' // ✅ 2KB
```

#### 7.3 Dynamic Imports for Heavy Libraries

```typescript
// Only load when needed
const exportToPDF = async (data: any) => {
  const jsPDF = await import('jspdf')
  const pdf = new jsPDF.default()
  // Generate PDF
}

const exportToExcel = async (data: any) => {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  // Generate Excel
}
```

### 8. State Management Optimization

#### 8.1 Avoid Unnecessary State Updates

❌ **Before (Triggers re-render on every keystroke):**
```typescript
const SearchBar = ({ onSearch }: { onSearch: (query: string) => void }) => {
  const [query, setQuery] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    onSearch(e.target.value) // Calls parent on every keystroke!
  }

  return <input value={query} onChange={handleChange} />
}
```

✅ **After (Debounced search):**
```typescript
import { useDebouncedCallback } from 'use-debounce'

const SearchBar = ({ onSearch }: { onSearch: (query: string) => void }) => {
  const [query, setQuery] = useState('')

  const debouncedSearch = useDebouncedCallback(
    (value: string) => onSearch(value),
    500
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    debouncedSearch(e.target.value)
  }

  return <input value={query} onChange={handleChange} />
}
```

#### 8.2 Use Context Wisely

❌ **Before (Single context with all data):**
```typescript
// Every component re-renders when ANY part of context changes
const AppContext = createContext({
  user: null,
  bookings: [],
  customers: [],
  staff: [],
  theme: 'light'
})
```

✅ **After (Separate contexts by concern):**
```typescript
// Split into focused contexts
const AuthContext = createContext({ user: null })
const BookingContext = createContext({ bookings: [] })
const ThemeContext = createContext({ theme: 'light' })

// Components only subscribe to what they need
```

### 9. Performance Monitoring

#### 9.1 Add Performance Marks

```typescript
const BookingsPage = () => {
  useEffect(() => {
    performance.mark('bookings-page-start')

    const fetchData = async () => {
      const bookings = await fetchBookings()
      performance.mark('bookings-page-end')
      performance.measure(
        'bookings-page-load',
        'bookings-page-start',
        'bookings-page-end'
      )

      const measure = performance.getEntriesByName('bookings-page-load')[0]
      console.log(`Bookings loaded in ${measure.duration}ms`)
    }

    fetchData()
  }, [])

  return <div>...</div>
}
```

#### 9.2 Use React DevTools Profiler Programmatically

```typescript
import { Profiler } from 'react'

const onRenderCallback = (
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number
) => {
  if (actualDuration > 16) { // Longer than 1 frame (60fps)
    console.warn(`Slow render detected: ${id} took ${actualDuration}ms`)
  }
}

const App = () => (
  <Profiler id="App" onRender={onRenderCallback}>
    <YourApp />
  </Profiler>
)
```

## Performance Optimization Checklist

### React Performance
- [ ] Identify components with unnecessary re-renders
- [ ] Add React.memo to pure components
- [ ] Use useMemo for expensive calculations
- [ ] Use useCallback for function props
- [ ] Implement virtualization for long lists (>100 items)
- [ ] Add loading skeletons for better perceived performance

### Data Fetching
- [ ] Use Promise.all for parallel queries
- [ ] Implement data caching where appropriate
- [ ] Optimize Supabase queries (select only needed fields)
- [ ] Add pagination for large datasets
- [ ] Use optimistic updates instead of refetching
- [ ] Limit realtime subscriptions to necessary data

### Code Splitting
- [ ] Lazy load route components
- [ ] Lazy load heavy libraries (charts, PDF, Excel)
- [ ] Code split by route
- [ ] Preload critical routes
- [ ] Add loading fallbacks for lazy components

### Bundle Optimization
- [ ] Analyze bundle size with visualizer
- [ ] Remove unused dependencies
- [ ] Use tree-shakeable imports (lodash-es, date-fns)
- [ ] Minify and compress assets
- [ ] Enable gzip compression on server

### Chart Performance
- [ ] Memoize chart data transformations
- [ ] Debounce chart updates
- [ ] Sample large datasets before charting
- [ ] Use lighter chart libraries if possible

### Image Optimization
- [ ] Add lazy loading to images
- [ ] Use appropriate image formats (WebP, AVIF)
- [ ] Compress images
- [ ] Use responsive images with srcset

### Memory Management
- [ ] Clean up subscriptions in useEffect
- [ ] Clear intervals and timeouts
- [ ] Unsubscribe from events
- [ ] Avoid memory leaks in closures

## Performance Targets

### Load Time Targets
- **First Contentful Paint**: < 1.8s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.8s
- **Total Blocking Time**: < 200ms

### Runtime Performance Targets
- **Component render time**: < 16ms (60fps)
- **List scrolling**: 60fps smooth
- **Search response**: < 300ms
- **Chart rendering**: < 500ms

### Bundle Size Targets
- **Initial JS bundle**: < 300KB gzipped
- **CSS bundle**: < 50KB gzipped
- **Total page weight**: < 1MB

### User Experience Metrics
- **Interaction feedback**: Immediate (<100ms)
- **Loading indicators**: Show after 200ms
- **Data fetching**: Show skeleton loaders

## Output Format

After optimization, provide:

1. **Performance Audit Results** - Before and after metrics
2. **Optimizations Applied** - List of changes made
3. **Bundle Size Comparison** - Before and after sizes
4. **Render Performance** - React DevTools profiler results
5. **Lighthouse Score** - Before and after scores
6. **Remaining Issues** - Known performance bottlenecks
7. **Monitoring Setup** - How to track performance going forward

## Notes

- Always measure before optimizing (no premature optimization)
- Focus on user-facing performance first
- Test performance on slow devices and networks
- Use React DevTools Profiler to find real bottlenecks
- Monitor bundle size in CI/CD
- Set performance budgets and enforce them
- Keep booking system fast - it's the core feature
