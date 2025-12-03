/**
 * Centralized Route Configuration
 *
 * Single source of truth for all application routes.
 * Includes metadata, permissions, and navigation settings.
 */

import {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  Users,
  UsersRound,
  MessageSquare,
  Package,
  BarChart3,
  Settings,
  UserCircle,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole, PermissionResource } from '@/types/common'

/**
 * Route Configuration Interface
 */
export interface RouteConfig {
  /** Unique route key */
  key: string
  /** URL path */
  path: string
  /** Page title */
  title: string
  /** Page description (for meta tags) */
  description?: string
  /** Icon component (for navigation) */
  icon?: LucideIcon
  /** Roles allowed to access this route */
  allowedRoles: UserRole[]
  /** Granular permissions for this route */
  permissions?: {
    view?: PermissionResource
    create?: PermissionResource
    edit?: PermissionResource
    delete?: PermissionResource
  }
  /** Breadcrumb trail */
  breadcrumbs?: string[]
  /** Show in navigation menu */
  showInNav: boolean
  /** Parent route key (for nested routes) */
  parent?: string
  /** Route parameters (for dynamic routes) */
  params?: string[]
}

/**
 * Public Routes (no authentication required)
 */
export const PUBLIC_ROUTES = {
  LOGIN: {
    key: 'login',
    path: '/login',
    title: 'เข้าสู่ระบบ',
    description: 'เข้าสู่ระบบ Tinedy CRM',
    allowedRoles: [],
    showInNav: false,
  },
  PAYMENT: {
    key: 'payment',
    path: '/payment/:bookingId',
    title: 'ชำระเงิน',
    description: 'ชำระเงินค่าบริการ',
    allowedRoles: [],
    showInNav: false,
    params: ['bookingId'],
  },
  PAYMENT_SUCCESS: {
    key: 'payment-success',
    path: '/payment/:bookingId/success',
    title: 'ชำระเงินสำเร็จ',
    description: 'การชำระเงินเสร็จสมบูรณ์',
    allowedRoles: [],
    showInNav: false,
    params: ['bookingId'],
  },
  UNAUTHORIZED: {
    key: 'unauthorized',
    path: '/unauthorized',
    title: 'ไม่มีสิทธิ์เข้าถึง',
    description: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้',
    allowedRoles: [],
    showInNav: false,
  },
} as const satisfies Record<string, RouteConfig>

/**
 * Admin & Manager Routes (share /admin paths)
 */
export const ADMIN_ROUTES = {
  ADMIN_DASHBOARD: {
    key: 'admin-dashboard',
    path: '/admin',
    title: 'Dashboard',
    description: 'ภาพรวมของระบบ',
    icon: LayoutDashboard,
    allowedRoles: ['admin', 'manager'],
    breadcrumbs: ['Dashboard'],
    showInNav: true,
  },
  BOOKINGS: {
    key: 'admin-bookings',
    path: '/admin/bookings',
    title: 'Bookings',
    description: 'จัดการการจอง',
    icon: ClipboardList,
    allowedRoles: ['admin', 'manager'],
    permissions: {
      view: 'bookings',
      create: 'bookings',
      edit: 'bookings',
      delete: 'bookings',
    },
    breadcrumbs: ['Dashboard', 'Bookings'],
    showInNav: true,
  },
  ADMIN_CALENDAR: {
    key: 'admin-calendar',
    path: '/admin/calendar',
    title: 'Calendar',
    description: 'ปฏิทินการจอง',
    icon: Calendar,
    allowedRoles: ['admin', 'manager'],
    permissions: {
      view: 'bookings',
    },
    breadcrumbs: ['Dashboard', 'Calendar'],
    showInNav: true,
  },
  // DISABLED: Weekly Schedule - ใช้ Calendar แทน
  // WEEKLY_SCHEDULE: {
  //   key: 'admin-weekly-schedule',
  //   path: '/admin/weekly-schedule',
  //   title: 'Weekly Schedule',
  //   description: 'ตารางงานรายสัปดาห์',
  //   icon: Calendar,
  //   allowedRoles: ['admin', 'manager'],
  //   permissions: {
  //     view: 'bookings',
  //   },
  //   breadcrumbs: ['Dashboard', 'Weekly Schedule'],
  //   showInNav: false,
  // },
  CUSTOMERS: {
    key: 'admin-customers',
    path: '/admin/customers',
    title: 'Customers',
    description: 'จัดการลูกค้า',
    icon: Users,
    allowedRoles: ['admin', 'manager'],
    permissions: {
      view: 'customers',
      create: 'customers',
      edit: 'customers',
      delete: 'customers',
    },
    breadcrumbs: ['Dashboard', 'Customers'],
    showInNav: true,
  },
  CUSTOMER_DETAIL: {
    key: 'admin-customer-detail',
    path: '/admin/customers/:id',
    title: 'Customer Details',
    description: 'รายละเอียดลูกค้า',
    allowedRoles: ['admin', 'manager'],
    permissions: {
      view: 'customers',
      edit: 'customers',
    },
    breadcrumbs: ['Dashboard', 'Customers', 'Details'],
    showInNav: false,
    parent: 'admin-customers',
    params: ['id'],
  },
  STAFF: {
    key: 'admin-staff',
    path: '/admin/staff',
    title: 'Staff',
    description: 'จัดการพนักงาน',
    icon: UsersRound,
    allowedRoles: ['admin', 'manager'],
    permissions: {
      view: 'staff',
      create: 'staff',
      edit: 'staff',
      delete: 'staff',
    },
    breadcrumbs: ['Dashboard', 'Staff'],
    showInNav: true,
  },
  STAFF_PERFORMANCE: {
    key: 'admin-staff-performance',
    path: '/admin/staff/:id',
    title: 'Staff Performance',
    description: 'ประสิทธิภาพการทำงาน',
    allowedRoles: ['admin', 'manager'],
    permissions: {
      view: 'staff',
    },
    breadcrumbs: ['Dashboard', 'Staff', 'Performance'],
    showInNav: false,
    parent: 'admin-staff',
    params: ['id'],
  },
  TEAMS: {
    key: 'admin-teams',
    path: '/admin/teams',
    title: 'Teams',
    description: 'จัดการทีม',
    icon: UsersRound,
    allowedRoles: ['admin', 'manager'],
    permissions: {
      view: 'teams',
      create: 'teams',
      edit: 'teams',
      delete: 'teams',
    },
    breadcrumbs: ['Dashboard', 'Teams'],
    showInNav: true,
  },
  TEAM_DETAIL: {
    key: 'admin-team-detail',
    path: '/admin/teams/:teamId',
    title: 'Team Details',
    description: 'รายละเอียดทีม',
    allowedRoles: ['admin', 'manager'],
    permissions: {
      view: 'teams',
      edit: 'teams',
    },
    breadcrumbs: ['Dashboard', 'Teams', 'Details'],
    showInNav: false,
    parent: 'admin-teams',
    params: ['teamId'],
  },
  ADMIN_CHAT: {
    key: 'admin-chat',
    path: '/admin/chat',
    title: 'Chat',
    description: 'ระบบแชท',
    icon: MessageSquare,
    allowedRoles: ['admin', 'manager'],
    breadcrumbs: ['Dashboard', 'Chat'],
    showInNav: true,
  },
  PACKAGES: {
    key: 'admin-packages',
    path: '/admin/packages',
    title: 'Service Packages',
    description: 'จัดการแพ็คเกจบริการ',
    icon: Package,
    allowedRoles: ['admin', 'manager'],
    permissions: {
      view: 'service_packages',
      create: 'service_packages',
      edit: 'service_packages',
      delete: 'service_packages',
    },
    breadcrumbs: ['Dashboard', 'Service Packages'],
    showInNav: true,
  },
  PACKAGE_DETAIL: {
    key: 'admin-package-detail',
    path: '/admin/packages/:packageId',
    title: 'Package Details',
    description: 'รายละเอียดแพ็คเกจ',
    allowedRoles: ['admin', 'manager'],
    permissions: {
      view: 'service_packages',
      edit: 'service_packages',
    },
    breadcrumbs: ['Dashboard', 'Service Packages', 'Details'],
    showInNav: false,
    parent: 'admin-packages',
    params: ['packageId'],
  },
  REPORTS: {
    key: 'admin-reports',
    path: '/admin/reports',
    title: 'Reports',
    description: 'รายงานและสถิติ',
    icon: BarChart3,
    allowedRoles: ['admin', 'manager'],
    permissions: {
      view: 'reports',
    },
    breadcrumbs: ['Dashboard', 'Reports'],
    showInNav: true,
  },
  ADMIN_PROFILE: {
    key: 'admin-profile',
    path: '/admin/profile',
    title: 'My Profile',
    description: 'ข้อมูลส่วนตัว',
    icon: UserCircle,
    allowedRoles: ['admin', 'manager'],
    breadcrumbs: ['Dashboard', 'My Profile'],
    showInNav: true,
  },
  ADMIN_SETTINGS: {
    key: 'admin-settings',
    path: '/admin/settings',
    title: 'Settings',
    description: 'ตั้งค่าระบบ',
    icon: Settings,
    allowedRoles: ['admin', 'manager'],
    permissions: {
      view: 'settings',
      edit: 'settings',
    },
    breadcrumbs: ['Dashboard', 'Settings'],
    showInNav: true,
  },
} as const satisfies Record<string, RouteConfig>

/**
 * Staff Routes
 */
export const STAFF_ROUTES = {
  STAFF_DASHBOARD: {
    key: 'staff-dashboard',
    path: '/staff',
    title: 'My Bookings',
    description: 'การจองของฉัน',
    icon: ClipboardList,
    allowedRoles: ['staff'],
    breadcrumbs: ['My Bookings'],
    showInNav: true,
  },
  STAFF_CALENDAR: {
    key: 'staff-calendar',
    path: '/staff/calendar',
    title: 'My Calendar',
    description: 'ปฏิทินงานของฉัน',
    icon: Calendar,
    allowedRoles: ['staff'],
    breadcrumbs: ['My Bookings', 'My Calendar'],
    showInNav: true,
  },
  STAFF_CHAT: {
    key: 'staff-chat',
    path: '/staff/chat',
    title: 'Chat',
    description: 'ระบบแชท',
    icon: MessageSquare,
    allowedRoles: ['staff'],
    breadcrumbs: ['My Bookings', 'Chat'],
    showInNav: true,
  },
  STAFF_PROFILE: {
    key: 'staff-profile',
    path: '/staff/profile',
    title: 'My Profile',
    description: 'ข้อมูลส่วนตัว',
    icon: Users,
    allowedRoles: ['staff'],
    breadcrumbs: ['My Bookings', 'My Profile'],
    showInNav: true,
  },
} as const satisfies Record<string, RouteConfig>

/**
 * All routes combined
 */
export const ALL_ROUTES = {
  ...PUBLIC_ROUTES,
  ...ADMIN_ROUTES,
  ...STAFF_ROUTES,
} as const

/**
 * Type-safe route keys
 */
export type RouteKey = keyof typeof ALL_ROUTES

/**
 * Get route config by key
 */
export function getRoute(key: RouteKey): RouteConfig {
  return ALL_ROUTES[key]
}

/**
 * Get all route configs as array
 */
export function getAllRoutes(): RouteConfig[] {
  return Object.values(ALL_ROUTES)
}

/**
 * Get routes by role
 */
export function getRoutesByRole(role: UserRole | null): RouteConfig[] {
  if (!role) return []
  return getAllRoutes().filter(route => route.allowedRoles.includes(role))
}

/**
 * Get navigation routes (only routes with showInNav = true)
 */
export function getNavRoutes(role: UserRole | null): RouteConfig[] {
  return getRoutesByRole(role).filter(route => route.showInNav)
}

/**
 * Find route by path
 */
export function findRouteByPath(pathname: string): RouteConfig | undefined {
  // Try exact match first
  const exactMatch = getAllRoutes().find(route => route.path === pathname)
  if (exactMatch) return exactMatch

  // Try pattern matching for dynamic routes
  return getAllRoutes().find(route => {
    if (!route.params || route.params.length === 0) return false

    // Convert route pattern to regex
    const pattern = route.path.replace(/:[^/]+/g, '[^/]+')
    const regex = new RegExp(`^${pattern}$`)
    return regex.test(pathname)
  })
}
