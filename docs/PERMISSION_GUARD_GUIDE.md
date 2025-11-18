# PermissionGuard Component Guide

คู่มือการใช้งาน `PermissionGuard` component สำหรับระบบ Permission-based UI rendering ใน Tinedy CRM

## 📋 Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Permission Modes](#permission-modes)
- [Convenience Wrappers](#convenience-wrappers)
- [Advanced Features](#advanced-features)
- [Migration Guide](#migration-guide)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

---

## Overview

`PermissionGuard` เป็น declarative component สำหรับควบคุมการแสดงผล UI elements ตาม permissions ของ user

### Key Features

- ✅ **7 Permission Modes** - รองรับการตรวจสอบ permission หลากหลายรูปแบบ
- ✅ **Type-Safe** - Full TypeScript support
- ✅ **Flexible Fallback** - Customize UI เมื่อไม่มี permission
- ✅ **Performance Optimized** - ใช้ React.memo
- ✅ **Accessibility** - รองรับ ARIA labels
- ✅ **Convenience Wrappers** - Pre-configured components สำหรับ common use cases

---

## Installation

Component อยู่ที่ `src/components/auth/permission-guard.tsx` แล้ว ไม่ต้อง install เพิ่ม

```tsx
import {
  PermissionGuard,
  AdminOnly,
  ManagerOrAdmin,
  StaffOnly,
  CanDelete,
  CanSoftDelete
} from '@/components/auth/permission-guard'
```

---

## Basic Usage

### ตัวอย่างพื้นฐาน

```tsx
import { AdminOnly } from '@/components/auth/permission-guard'

function MyComponent() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* แสดงเฉพาะ Admin */}
      <AdminOnly>
        <button>Delete All Users</button>
      </AdminOnly>
    </div>
  )
}
```

### การใช้งาน PermissionGuard แบบ Custom

```tsx
import { PermissionGuard } from '@/components/auth/permission-guard'

function BookingList() {
  return (
    <div>
      {/* ตรวจสอบ action-based permission */}
      <PermissionGuard
        requires={{ mode: 'action', action: 'create', resource: 'bookings' }}
      >
        <button>Create New Booking</button>
      </PermissionGuard>
    </div>
  )
}
```

---

## Permission Modes

### 1. **Action Mode** - ตรวจสอบ action บน resource

```tsx
<PermissionGuard
  requires={{
    mode: 'action',
    action: 'create',
    resource: 'bookings'
  }}
>
  <CreateBookingButton />
</PermissionGuard>
```

**Actions**: `'create' | 'read' | 'update' | 'delete'`
**Resources**: `'bookings' | 'customers' | 'teams' | 'staff' | 'service_packages'`

---

### 2. **Role Mode** - ตรวจสอบ user role

```tsx
{/* Single role */}
<PermissionGuard
  requires={{ mode: 'role', roles: ['admin'] }}
>
  <AdminPanel />
</PermissionGuard>

{/* Multiple roles (OR logic - ต้องมีอย่างน้อย 1 role) */}
<PermissionGuard
  requires={{ mode: 'role', roles: ['admin', 'manager'] }}
>
  <ReportsPage />
</PermissionGuard>
```

**Roles**: `'admin' | 'manager' | 'staff'`

---

### 3. **Feature Mode** - ตรวจสอบ feature flag

```tsx
<PermissionGuard
  requires={{ mode: 'feature', feature: 'beta_analytics' }}
>
  <BetaAnalyticsDashboard />
</PermissionGuard>
```

---

### 4. **Route Mode** - ตรวจสอบการเข้าถึง route

```tsx
<PermissionGuard
  requires={{ mode: 'route', route: '/admin/settings' }}
>
  <SettingsLink />
</PermissionGuard>
```

---

### 5. **Delete Mode** - ตรวจสอบ delete permission

```tsx
<PermissionGuard
  requires={{ mode: 'delete', resource: 'bookings' }}
>
  <DeleteBookingButton />
</PermissionGuard>
```

---

### 6. **Soft Delete Mode** - ตรวจสอบ soft delete permission

```tsx
<PermissionGuard
  requires={{ mode: 'softDelete', resource: 'bookings' }}
>
  <CancelBookingButton />
</PermissionGuard>
```

---

### 7. **Custom Mode** - Custom check function

```tsx
<PermissionGuard
  requires={{
    mode: 'custom',
    check: (permissions) => {
      return permissions.role === 'admin' && permissions.hasFeature('advanced_mode')
    }
  }}
>
  <AdvancedFeature />
</PermissionGuard>
```

---

## Convenience Wrappers

Pre-configured components สำหรับ common use cases

### AdminOnly

```tsx
import { AdminOnly } from '@/components/auth/permission-guard'

<AdminOnly>
  <DeleteAllButton />
</AdminOnly>
```

### ManagerOrAdmin

```tsx
import { ManagerOrAdmin } from '@/components/auth/permission-guard'

<ManagerOrAdmin>
  <ViewReportsButton />
</ManagerOrAdmin>
```

### StaffOnly

```tsx
import { StaffOnly } from '@/components/auth/permission-guard'

<StaffOnly>
  <MyScheduleView />
</StaffOnly>
```

### CanDelete

```tsx
import { CanDelete } from '@/components/auth/permission-guard'

<CanDelete resource="bookings">
  <DeleteBookingButton />
</CanDelete>
```

### CanSoftDelete

```tsx
import { CanSoftDelete } from '@/components/auth/permission-guard'

<CanSoftDelete resource="bookings">
  <CancelBookingButton />
</CanSoftDelete>
```

---

## Advanced Features

### Multiple Permissions (OR Logic)

Default behavior: ถ้ามี permission อย่างน้อย 1 อันใน array ก็จะแสดง

```tsx
<PermissionGuard
  requires={[
    { mode: 'role', roles: ['admin'] },
    { mode: 'role', roles: ['manager'] }
  ]}
>
  <ManagerPanel />
</PermissionGuard>
```

### Multiple Permissions (AND Logic)

ต้องมี permission ทุกอันใน array

```tsx
<PermissionGuard
  requires={[
    { mode: 'role', roles: ['admin'] },
    { mode: 'feature', feature: 'advanced_mode' }
  ]}
  requireAll={true}
>
  <AdvancedAdminFeature />
</PermissionGuard>
```

### Fallback UI Options

#### 1. Hidden (Default)

```tsx
<PermissionGuard
  requires={{ mode: 'role', roles: ['admin'] }}
  fallback="hidden"
>
  <AdminPanel />
</PermissionGuard>
```

#### 2. Message

```tsx
<PermissionGuard
  requires={{ mode: 'role', roles: ['admin'] }}
  fallback="message"
  fallbackMessage="You need admin access to view this."
>
  <AdminPanel />
</PermissionGuard>
```

#### 3. Alert

```tsx
<PermissionGuard
  requires={{ mode: 'role', roles: ['admin'] }}
  fallback="alert"
  fallbackMessage="Admin access required."
>
  <AdminPanel />
</PermissionGuard>
```

#### 4. Custom Component

```tsx
<PermissionGuard
  requires={{ mode: 'role', roles: ['admin'] }}
  fallback={
    <Card>
      <CardContent>
        <p>Please contact your administrator for access.</p>
      </CardContent>
    </Card>
  }
>
  <AdminPanel />
</PermissionGuard>
```

### Loading State

```tsx
<PermissionGuard
  requires={{ mode: 'role', roles: ['admin'] }}
  loadingFallback={<Spinner />}
>
  <AdminPanel />
</PermissionGuard>
```

### Debug Mode

```tsx
<PermissionGuard
  requires={{ mode: 'role', roles: ['admin'] }}
  debug={true}
>
  <AdminPanel />
</PermissionGuard>
```

จะแสดง console.log:
```
[PermissionGuard] {
  requires: { mode: 'role', roles: ['admin'] },
  requireAll: false,
  hasPermission: true,
  userRole: 'admin',
  permissions: {...}
}
```

---

## Migration Guide

### Before (Old Pattern)

```tsx
import { usePermissions } from '@/hooks/use-permissions'

function BookingsPage() {
  const { isAdmin } = usePermissions()

  return (
    <div>
      <h1>Bookings</h1>

      {isAdmin && (
        <div className="admin-actions">
          <button>Delete All</button>
          <button>Export Data</button>
        </div>
      )}
    </div>
  )
}
```

### After (New Pattern)

```tsx
import { AdminOnly } from '@/components/auth/permission-guard'

function BookingsPage() {
  return (
    <div>
      <h1>Bookings</h1>

      <AdminOnly>
        <div className="admin-actions">
          <button>Delete All</button>
          <button>Export Data</button>
        </div>
      </AdminOnly>
    </div>
  )
}
```

### Benefits

1. ✅ **Cleaner Code** - ไม่ต้อง import usePermissions hook
2. ✅ **Declarative** - อ่านง่ายกว่า เห็นชัดว่า component ไหนต้องการ permission อะไร
3. ✅ **Reusable** - ใช้ convenience wrappers ซ้ำได้ทั่ว codebase
4. ✅ **Type-Safe** - TypeScript จะ catch errors ได้เร็วขึ้น
5. ✅ **Testable** - ทดสอบง่ายกว่า

---

## Best Practices

### 1. ใช้ Convenience Wrappers เมื่อเป็นไปได้

```tsx
// ❌ Don't
<PermissionGuard requires={{ mode: 'role', roles: ['admin'] }}>
  <DeleteButton />
</PermissionGuard>

// ✅ Do
<AdminOnly>
  <DeleteButton />
</AdminOnly>
```

### 2. กลุ่ม Related Elements

```tsx
// ❌ Don't - Wrap แยกทีละ element
<AdminOnly>
  <Button1 />
</AdminOnly>
<AdminOnly>
  <Button2 />
</AdminOnly>
<AdminOnly>
  <Button3 />
</AdminOnly>

// ✅ Do - Wrap กลุ่มที่เกี่ยวข้อง
<AdminOnly>
  <div className="admin-actions">
    <Button1 />
    <Button2 />
    <Button3 />
  </div>
</AdminOnly>
```

### 3. ใช้ Fallback เมื่อ User ควรรู้ว่าทำไมไม่เห็น

```tsx
// ✅ Good - สำหรับ features ที่อาจมองเห็นได้
<AdminOnly
  fallback="message"
  fallbackMessage="Contact admin to enable this feature."
>
  <PremiumFeature />
</AdminOnly>

// ✅ Good - สำหรับ UI elements ที่ควรซ่อน
<AdminOnly fallback="hidden">
  <DeleteButton />
</AdminOnly>
```

### 4. Combine กับ Permission-Aware Components

```tsx
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'

// Component จะตรวจสอบ permission เองด้วย canDelete()
<PermissionAwareDeleteButton
  resource="bookings"
  onDelete={handleDelete}
/>
```

### 5. ใช้ Custom Mode สำหรับ Complex Logic

```tsx
<PermissionGuard
  requires={{
    mode: 'custom',
    check: (permissions) => {
      // Complex business logic
      const isOwner = booking.created_by === permissions.userId
      const isAdmin = permissions.role === 'admin'
      const canEditOwnBookings = permissions.can('update', 'bookings')

      return isAdmin || (isOwner && canEditOwnBookings)
    }
  }}
>
  <EditBookingButton />
</PermissionGuard>
```

---

## Common Patterns

### Pattern 1: Admin-Only Archive Toggle

```tsx
<div className="filters">
  <AdminOnly>
    <div className="flex items-center space-x-2">
      <Checkbox
        id="show-archived"
        checked={showArchived}
        onCheckedChange={setShowArchived}
      />
      <label htmlFor="show-archived">
        Show archived items
      </label>
    </div>
  </AdminOnly>
</div>
```

**Used in**: `bookings.tsx`, `customers.tsx`, `teams.tsx`

---

### Pattern 2: Role-Specific Select Options

```tsx
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select role" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="staff">Staff</SelectItem>

    <AdminOnly>
      <SelectItem value="manager">Manager</SelectItem>
      <SelectItem value="admin">Admin</SelectItem>
    </AdminOnly>
  </SelectContent>
</Select>
```

**Used in**: `staff.tsx`

---

### Pattern 3: Page-Level Protection

```tsx
export default function SettingsPage() {
  return (
    <AdminOnly
      fallback="alert"
      fallbackMessage="Only administrators can access system settings."
    >
      {renderSettings()}
    </AdminOnly>
  )
}

function renderSettings() {
  return (
    <div className="settings-page">
      {/* All settings UI */}
    </div>
  )
}
```

**Used in**: `settings.tsx`

---

### Pattern 4: Action Buttons Group

```tsx
<AdminOnly>
  <div className="flex items-center gap-2">
    <Button variant="outline" onClick={handleActivate}>
      Activate
    </Button>
    <Button variant="outline" onClick={handleEdit}>
      Edit
    </Button>
    <Button variant="destructive" onClick={handleDelete}>
      Delete
    </Button>
  </div>
</AdminOnly>
```

**Used in**: `package-detail.tsx`

---

## Troubleshooting

### PermissionGuard ไม่แสดง children แม้มี permission

**เช็ค**:
1. ✅ User ล็อกอินแล้วหรือยัง?
2. ✅ Permission mode ถูกต้องหรือไม่? (action/role/feature)
3. ✅ Resource name ตรงกับ type definition หรือไม่?
4. ✅ เปิด debug mode ดู: `debug={true}`

```tsx
<PermissionGuard
  requires={{ mode: 'role', roles: ['admin'] }}
  debug={true}
>
  <AdminPanel />
</PermissionGuard>
```

---

### TypeScript Error: Type 'X' is not assignable

**แก้ไข**: ใช้ type ที่ถูกต้องตาม interface

```tsx
// ❌ Wrong
<PermissionGuard requires={{ mode: 'role', roles: ['superadmin'] }}>

// ✅ Correct
<PermissionGuard requires={{ mode: 'role', roles: ['admin'] }}>
```

---

### Fallback Message ไม่แสดง

**เช็ค**:
```tsx
// ❌ Wrong - ใช้ fallback="hidden" (default)
<PermissionGuard requires={...}>

// ✅ Correct - ต้องระบุ fallback type
<PermissionGuard
  requires={...}
  fallback="message"
  fallbackMessage="Access denied"
>
```

---

### Loading State ไม่แสดง

```tsx
<PermissionGuard
  requires={...}
  loadingFallback={<Spinner />}  // เพิ่มตรงนี้
>
  <Content />
</PermissionGuard>
```

---

## Testing

### Unit Testing Example

```tsx
import { render, screen } from '@testing-library/react'
import { PermissionGuard } from '@/components/auth/permission-guard'
import { usePermissions } from '@/hooks/use-permissions'

vi.mock('@/hooks/use-permissions')

test('renders children for admin role', () => {
  vi.mocked(usePermissions).mockReturnValue({
    role: 'admin',
    isAdmin: true,
    // ... other permissions
  })

  render(
    <PermissionGuard requires={{ mode: 'role', roles: ['admin'] }}>
      <div>Admin Content</div>
    </PermissionGuard>
  )

  expect(screen.getByText('Admin Content')).toBeInTheDocument()
})
```

ดู `src/components/auth/__tests__/permission-guard.test.tsx` สำหรับ comprehensive test examples

---

## Summary

### ข้อดีของ PermissionGuard

- ✅ Declarative และอ่านง่าย
- ✅ Type-safe
- ✅ Reusable
- ✅ Testable
- ✅ Performance optimized
- ✅ Flexible fallback options

### เมื่อไหร่ควรใช้

- ✅ ซ่อน/แสดง UI elements ตาม permissions
- ✅ Protect routes หรือ pages
- ✅ แสดง fallback message เมื่อไม่มี permission
- ✅ Complex permission logic

### เมื่อไหร่ไม่ควรใช้

- ❌ ตรวจสอบ permission ใน business logic (ใช้ `usePermissions()` hook แทน)
- ❌ Server-side authorization (ต้องทำที่ backend ด้วย)
- ❌ Single simple check ที่ต้องการ boolean result (ใช้ `isAdmin()` ตรงๆ)

---

## Further Reading

- [usePermissions Hook Documentation](../src/hooks/use-permissions.ts)
- [RBAC Types](../src/types/common.ts)
- [Permission Guard Tests](../src/components/auth/__tests__/permission-guard.test.tsx)

---

**Last Updated**: Phase 4 Completion
**Version**: 1.0.0
**Maintainer**: Tinedy CRM Team
