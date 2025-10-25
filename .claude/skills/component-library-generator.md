---
name: component-library-generator
description: Generate reusable component library from duplicated UI patterns in Tinedy CRM
---

# Component Library Generator Skill

## Purpose
Systematically identify repeated UI patterns in Tinedy CRM and extract them into a reusable component library. Create consistent, well-documented, and type-safe shared components that can be used throughout the application to reduce code duplication and improve maintainability.

## When to Use
- Same UI pattern appears 3+ times across the codebase
- Need to ensure UI consistency across pages
- Creating new features that could benefit from shared components
- Refactoring existing code with duplicated UI elements
- Building a design system for the application
- Want to improve component discoverability

## Scope
This skill focuses on:
1. **Pattern Detection** - Identifying repeated UI patterns
2. **Component Extraction** - Creating reusable components from patterns
3. **API Design** - Designing clean, flexible component APIs
4. **Documentation** - Creating comprehensive component documentation
5. **Storybook Integration** - Visual documentation and testing
6. **Design Tokens** - Extracting colors, spacing, typography into tokens
7. **Component Composition** - Building complex UIs from simple components

## Component Library Structure

### Recommended Directory Structure
```
src/
├── components/
│   ├── ui/                          # Shadcn UI primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── common/                      # Shared business components
│   │   ├── StatusBadge/
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── StatusBadge.stories.tsx
│   │   │   └── index.ts
│   │   ├── DateRangePicker/
│   │   │   ├── DateRangePicker.tsx
│   │   │   ├── DateRangePicker.stories.tsx
│   │   │   └── index.ts
│   │   ├── DataTable/
│   │   │   ├── DataTable.tsx
│   │   │   ├── DataTablePagination.tsx
│   │   │   ├── DataTableToolbar.tsx
│   │   │   ├── DataTable.stories.tsx
│   │   │   └── index.ts
│   │   ├── StatCard/
│   │   ├── EmptyState/
│   │   ├── LoadingState/
│   │   ├── ErrorState/
│   │   ├── ConfirmDialog/
│   │   └── index.ts                 # Barrel export
│   ├── booking/                     # Domain-specific components
│   ├── customer/
│   ├── staff/
│   └── layout/
├── lib/
│   └── design-tokens.ts            # Design system tokens
└── stories/                         # Storybook configuration
    └── Introduction.mdx
```

## Pattern Detection Process

### Step 1: Scan Codebase for Patterns

Look for these common repeated patterns:

#### 1.1 Status Badges
```typescript
// Found in: bookings.tsx, customer-detail.tsx, staff-performance.tsx
<span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
  Completed
</span>

<span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
  Pending
</span>

<span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
  Cancelled
</span>
```

#### 1.2 Stat Cards
```typescript
// Found in: dashboard.tsx, reports.tsx, staff/dashboard.tsx
<Card>
  <CardHeader>
    <CardTitle className="text-sm font-medium text-muted-foreground">
      Total Revenue
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">฿{totalRevenue}</div>
    <p className="text-xs text-muted-foreground">
      <span className="text-green-600">↑ 12%</span> from last month
    </p>
  </CardContent>
</Card>
```

#### 1.3 Empty States
```typescript
// Found in: Multiple list views
<div className="text-center py-12">
  <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
  <h3 className="mt-4 text-lg font-semibold">No bookings found</h3>
  <p className="mt-2 text-sm text-muted-foreground">
    Try adjusting your filters or create a new booking
  </p>
  <Button className="mt-4">Create Booking</Button>
</div>
```

#### 1.4 Loading States
```typescript
// Found in: Multiple pages
{loading && (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
  </div>
)}
```

#### 1.5 Confirm Dialogs
```typescript
// Found in: Delete actions across multiple pages
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Step 2: Analyze Pattern Usage

For each pattern found:
1. Count occurrences across codebase
2. Identify variations in the pattern
3. List all props/options needed
4. Determine if pattern is stable (won't change often)
5. Estimate reusability potential

## Component Extraction Examples

### Example 1: StatusBadge Component

#### Before (Duplicated in 5+ files):
```typescript
// In bookings.tsx
<span className={`px-2 py-1 rounded-full text-xs ${
  booking.status === 'completed' ? 'bg-green-100 text-green-800' :
  booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
  booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
  'bg-gray-100 text-gray-800'
}`}>
  {booking.status}
</span>

// In customer-detail.tsx (similar code)
// In staff-performance.tsx (similar code)
```

#### After (Extracted Component):

**File: `src/components/common/StatusBadge/StatusBadge.tsx`**
```typescript
import { cva, type VariantProps } from 'class-variance-authority'

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        danger: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800',
        purple: 'bg-purple-100 text-purple-800',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-xs',
        md: 'px-2 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  /**
   * Status text to display in the badge
   */
  status?: string
  /**
   * Optional icon to display before the status text
   */
  icon?: React.ReactNode
}

export const StatusBadge = ({
  variant,
  size,
  status,
  icon,
  className,
  children,
  ...props
}: StatusBadgeProps) => {
  return (
    <span
      className={statusBadgeVariants({ variant, size, className })}
      {...props}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {status || children}
    </span>
  )
}

// Helper functions for common status mappings
export const getBookingStatusVariant = (
  status: string
): VariantProps<typeof statusBadgeVariants>['variant'] => {
  const statusMap: Record<string, VariantProps<typeof statusBadgeVariants>['variant']> = {
    completed: 'success',
    confirmed: 'info',
    pending: 'warning',
    cancelled: 'danger',
    in_progress: 'purple',
  }
  return statusMap[status] || 'default'
}

export const getPaymentStatusVariant = (
  status: string
): VariantProps<typeof statusBadgeVariants>['variant'] => {
  const statusMap: Record<string, VariantProps<typeof statusBadgeVariants>['variant']> = {
    paid: 'success',
    unpaid: 'warning',
    partial: 'info',
    refunded: 'danger',
  }
  return statusMap[status] || 'default'
}

StatusBadge.displayName = 'StatusBadge'
```

**File: `src/components/common/StatusBadge/index.ts`**
```typescript
export {
  StatusBadge,
  getBookingStatusVariant,
  getPaymentStatusVariant,
  type StatusBadgeProps,
} from './StatusBadge'
```

**Usage:**
```typescript
import { StatusBadge, getBookingStatusVariant } from '@/components/common/StatusBadge'

// Simple usage
<StatusBadge variant="success">Completed</StatusBadge>

// With helper function
<StatusBadge variant={getBookingStatusVariant(booking.status)}>
  {booking.status}
</StatusBadge>

// With icon
<StatusBadge variant="success" icon={<CheckCircle className="h-3 w-3" />}>
  Verified
</StatusBadge>
```

---

### Example 2: StatCard Component

**File: `src/components/common/StatCard/StatCard.tsx`**
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatCardProps {
  /**
   * Title of the stat card
   */
  title: string
  /**
   * Main value to display
   */
  value: string | number
  /**
   * Optional description or subtitle
   */
  description?: string
  /**
   * Optional icon to display
   */
  icon?: LucideIcon
  /**
   * Icon color class
   */
  iconColor?: string
  /**
   * Icon background color class
   */
  iconBgColor?: string
  /**
   * Optional trend indicator
   */
  trend?: {
    value: string
    direction: 'up' | 'down' | 'neutral'
    label?: string
  }
  /**
   * Optional action button
   */
  action?: {
    label: string
    onClick: () => void
  }
  /**
   * Loading state
   */
  isLoading?: boolean
  /**
   * Custom className for the card
   */
  className?: string
}

export const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  iconColor = 'text-primary',
  iconBgColor = 'bg-primary/10',
  trend,
  action,
  isLoading = false,
  className,
}: StatCardProps) => {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div className={cn('rounded-lg p-2', iconBgColor)}>
            <Icon className={cn('h-4 w-4', iconColor)} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>

            {(description || trend) && (
              <div className="flex items-center gap-2 mt-1">
                {trend && (
                  <span
                    className={cn(
                      'text-xs font-medium',
                      trend.direction === 'up' && 'text-green-600',
                      trend.direction === 'down' && 'text-red-600',
                      trend.direction === 'neutral' && 'text-gray-600'
                    )}
                  >
                    {trend.direction === 'up' && '↑ '}
                    {trend.direction === 'down' && '↓ '}
                    {trend.value}
                  </span>
                )}
                {description && (
                  <p className="text-xs text-muted-foreground">
                    {trend?.label || description}
                  </p>
                )}
              </div>
            )}

            {action && (
              <button
                onClick={action.onClick}
                className="mt-3 text-xs font-medium text-primary hover:underline"
              >
                {action.label} →
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

StatCard.displayName = 'StatCard'
```

**Usage:**
```typescript
import { StatCard } from '@/components/common/StatCard'
import { DollarSign, Users, Calendar, TrendingUp } from 'lucide-react'

<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  <StatCard
    title="Total Revenue"
    value="฿125,000"
    icon={DollarSign}
    iconColor="text-green-600"
    iconBgColor="bg-green-100"
    trend={{
      value: '+12%',
      direction: 'up',
      label: 'from last month'
    }}
  />

  <StatCard
    title="Total Bookings"
    value={256}
    icon={Calendar}
    description="148 completed this month"
  />

  <StatCard
    title="Active Customers"
    value={1234}
    icon={Users}
    isLoading={loading}
  />
</div>
```

---

### Example 3: EmptyState Component

**File: `src/components/common/EmptyState/EmptyState.tsx`**
```typescript
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  /**
   * Icon to display
   */
  icon?: LucideIcon
  /**
   * Title text
   */
  title: string
  /**
   * Description text
   */
  description?: string
  /**
   * Primary action button
   */
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  /**
   * Secondary action button
   */
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  /**
   * Custom className
   */
  className?: string
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) => {
  const ActionIcon = action?.icon

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      {Icon && (
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      <h3 className="text-lg font-semibold text-center">{title}</h3>

      {description && (
        <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-6">
          {action && (
            <Button onClick={action.onClick} size="sm">
              {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
              {action.label}
            </Button>
          )}

          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="outline" size="sm">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

EmptyState.displayName = 'EmptyState'
```

**Usage:**
```typescript
import { EmptyState } from '@/components/common/EmptyState'
import { Calendar, Plus } from 'lucide-react'

// No bookings found
<EmptyState
  icon={Calendar}
  title="No bookings found"
  description="Try adjusting your filters or create a new booking to get started"
  action={{
    label: 'Create Booking',
    onClick: () => setShowCreateModal(true),
    icon: Plus
  }}
  secondaryAction={{
    label: 'Clear Filters',
    onClick: resetFilters
  }}
/>
```

---

### Example 4: ConfirmDialog Component

**File: `src/components/common/ConfirmDialog/ConfirmDialog.tsx`**
```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export interface ConfirmDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean
  /**
   * Callback when dialog open state changes
   */
  onOpenChange: (open: boolean) => void
  /**
   * Dialog title
   */
  title: string
  /**
   * Dialog description
   */
  description: string
  /**
   * Confirm button label
   */
  confirmLabel?: string
  /**
   * Cancel button label
   */
  cancelLabel?: string
  /**
   * Callback when confirmed
   */
  onConfirm: () => void | Promise<void>
  /**
   * Callback when cancelled
   */
  onCancel?: () => void
  /**
   * Variant of the confirm button
   */
  variant?: 'default' | 'destructive'
  /**
   * Whether the action is loading
   */
  isLoading?: boolean
}

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) => {
  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

ConfirmDialog.displayName = 'ConfirmDialog'
```

**Usage:**
```typescript
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useState } from 'react'

const [showDeleteDialog, setShowDeleteDialog] = useState(false)
const [deletingId, setDeletingId] = useState<string | null>(null)

const handleDelete = async () => {
  if (!deletingId) return
  await deleteBooking(deletingId)
  toast({ title: 'Booking deleted successfully' })
}

<ConfirmDialog
  open={showDeleteDialog}
  onOpenChange={setShowDeleteDialog}
  title="Delete Booking"
  description="Are you sure you want to delete this booking? This action cannot be undone."
  confirmLabel="Delete"
  cancelLabel="Cancel"
  variant="destructive"
  onConfirm={handleDelete}
  isLoading={isDeleting}
/>
```

---

### Example 5: DataTable Component (Complex)

**File: `src/components/common/DataTable/DataTable.tsx`**
```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export interface TableColumn<T> {
  /**
   * Unique key for the column
   */
  key: string
  /**
   * Column header label
   */
  label: string
  /**
   * Whether the column is sortable
   */
  sortable?: boolean
  /**
   * Custom render function for the cell
   */
  render?: (value: any, row: T, index: number) => React.ReactNode
  /**
   * Accessor function to get the value from row
   */
  accessor?: (row: T) => any
  /**
   * Column width (CSS value)
   */
  width?: string
  /**
   * Text alignment
   */
  align?: 'left' | 'center' | 'right'
  /**
   * Custom header class
   */
  headerClassName?: string
  /**
   * Custom cell class
   */
  cellClassName?: string
}

export interface DataTableProps<T> {
  /**
   * Column definitions
   */
  columns: TableColumn<T>[]
  /**
   * Data array
   */
  data: T[]
  /**
   * Loading state
   */
  isLoading?: boolean
  /**
   * Empty state component
   */
  emptyState?: React.ReactNode
  /**
   * Row key accessor
   */
  getRowKey: (row: T) => string
  /**
   * Row click handler
   */
  onRowClick?: (row: T) => void
  /**
   * Sort configuration
   */
  sorting?: {
    column: string
    direction: 'asc' | 'desc'
  }
  /**
   * Sort change handler
   */
  onSortChange?: (column: string, direction: 'asc' | 'desc') => void
  /**
   * Custom row className function
   */
  getRowClassName?: (row: T, index: number) => string
  /**
   * Show row hover effect
   */
  hoverable?: boolean
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyState,
  getRowKey,
  onRowClick,
  sorting,
  onSortChange,
  getRowClassName,
  hoverable = true,
}: DataTableProps<T>) {
  const handleSort = (column: string) => {
    if (!onSortChange) return

    const newDirection =
      sorting?.column === column && sorting.direction === 'asc' ? 'desc' : 'asc'
    onSortChange(column, newDirection)
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                style={{ width: column.width }}
                className={cn(
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right',
                  column.sortable && 'cursor-pointer select-none',
                  column.headerClassName
                )}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-2">
                  {column.label}
                  {column.sortable && sorting?.column === column.key && (
                    <span>{sorting.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow
              key={getRowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                onRowClick && hoverable && 'cursor-pointer',
                getRowClassName?.(row, rowIndex)
              )}
            >
              {columns.map((column) => {
                const value = column.accessor
                  ? column.accessor(row)
                  : (row as any)[column.key]

                return (
                  <TableCell
                    key={column.key}
                    className={cn(
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.cellClassName
                    )}
                  >
                    {column.render
                      ? column.render(value, row, rowIndex)
                      : value}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

DataTable.displayName = 'DataTable'
```

**Usage:**
```typescript
import { DataTable, TableColumn } from '@/components/common/DataTable'
import { StatusBadge, getBookingStatusVariant } from '@/components/common/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'

const columns: TableColumn<Booking>[] = [
  {
    key: 'booking_date',
    label: 'Date',
    sortable: true,
    render: (value) => formatDate(value),
  },
  {
    key: 'customer',
    label: 'Customer',
    accessor: (row) => row.customer?.full_name,
  },
  {
    key: 'service',
    label: 'Service',
    accessor: (row) => row.service_packages?.name,
  },
  {
    key: 'total_price',
    label: 'Amount',
    align: 'right',
    render: (value) => formatCurrency(value),
  },
  {
    key: 'status',
    label: 'Status',
    align: 'center',
    render: (value) => (
      <StatusBadge variant={getBookingStatusVariant(value)}>
        {value}
      </StatusBadge>
    ),
  },
]

<DataTable
  columns={columns}
  data={bookings}
  getRowKey={(row) => row.id}
  onRowClick={handleRowClick}
  isLoading={loading}
  sorting={sorting}
  onSortChange={handleSortChange}
  emptyState={
    <EmptyState
      icon={Calendar}
      title="No bookings found"
      description="Create your first booking to get started"
    />
  }
/>
```

## Design Tokens

### Create Design System Tokens

**File: `src/lib/design-tokens.ts`**
```typescript
/**
 * Design system tokens for Tinedy CRM
 * Centralized design values for consistency
 */

// Status colors
export const STATUS_COLORS = {
  success: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
  },
  warning: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
  },
  danger: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
  },
  info: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
  },
  neutral: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
  },
} as const

// Spacing scale
export const SPACING = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  '2xl': '3rem', // 48px
  '3xl': '4rem', // 64px
} as const

// Typography scale
export const FONT_SIZE = {
  xs: '0.75rem', // 12px
  sm: '0.875rem', // 14px
  base: '1rem', // 16px
  lg: '1.125rem', // 18px
  xl: '1.25rem', // 20px
  '2xl': '1.5rem', // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
} as const

// Border radius
export const RADIUS = {
  none: '0',
  sm: '0.125rem', // 2px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
  full: '9999px',
} as const

// Shadow scale
export const SHADOW = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
} as const

// Animation durations
export const DURATION = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
} as const
```

## Component Documentation Standards

### JSDoc Template
```typescript
/**
 * [Component Name] - [Brief description]
 *
 * @example
 * ```tsx
 * <ComponentName
 *   prop1="value"
 *   prop2={123}
 * />
 * ```
 *
 * @see {@link https://docs.example.com | Documentation}
 */
```

### Prop Documentation
```typescript
export interface ComponentProps {
  /**
   * Description of the prop
   * @default defaultValue
   */
  propName: string

  /**
   * Optional prop with multiple options
   * @default 'default'
   */
  variant?: 'default' | 'primary' | 'secondary'
}
```

## Barrel Exports

**File: `src/components/common/index.ts`**
```typescript
// Barrel export for easy imports
export { StatusBadge, getBookingStatusVariant, getPaymentStatusVariant } from './StatusBadge'
export { StatCard } from './StatCard'
export { EmptyState } from './EmptyState'
export { ConfirmDialog } from './ConfirmDialog'
export { DataTable } from './DataTable'
export { LoadingState } from './LoadingState'
export { ErrorState } from './ErrorState'

export type { StatusBadgeProps } from './StatusBadge'
export type { StatCardProps } from './StatCard'
export type { EmptyStateProps } from './EmptyState'
export type { ConfirmDialogProps } from './ConfirmDialog'
export type { DataTableProps, TableColumn } from './DataTable'
```

**Usage:**
```typescript
// Instead of multiple imports
import { StatusBadge } from '@/components/common/StatusBadge'
import { StatCard } from '@/components/common/StatCard'
import { EmptyState } from '@/components/common/EmptyState'

// Single import
import { StatusBadge, StatCard, EmptyState } from '@/components/common'
```

## Component Generation Checklist

For each new component:
- [ ] Identify the pattern and count occurrences (min 3+)
- [ ] Design the component API (props interface)
- [ ] Create the component with TypeScript
- [ ] Add proper JSDoc documentation
- [ ] Use class-variance-authority for variants (if needed)
- [ ] Add displayName for React DevTools
- [ ] Create barrel export (index.ts)
- [ ] Add to common/index.ts barrel export
- [ ] Write Storybook story (optional but recommended)
- [ ] Update existing code to use new component
- [ ] Test in multiple contexts
- [ ] Document in component library README

## Benefits of Component Library

✅ **Consistency** - Same UI patterns everywhere
✅ **Maintainability** - Update once, apply everywhere
✅ **Productivity** - Faster development with reusable components
✅ **Type Safety** - Full TypeScript support
✅ **Documentation** - Self-documenting with JSDoc
✅ **Testing** - Test once, confident everywhere
✅ **Discoverability** - Easy to find and use components
✅ **Design System** - Foundation for scalable UI

## Output Format

After creating component library, provide:

1. **Component Inventory** - List of all components created
2. **Usage Examples** - How to import and use each component
3. **Migration Guide** - How to replace duplicated code
4. **Before/After Metrics** - Code reduction statistics
5. **API Reference** - Props and methods for each component
6. **Next Steps** - Additional components to consider

## Notes

- Start with the most duplicated patterns first
- Keep components simple and focused
- Prioritize composition over configuration
- Use TypeScript generics for reusable data components
- Document edge cases and limitations
- Consider accessibility (ARIA labels, keyboard navigation)
- Test components in isolation before deploying
