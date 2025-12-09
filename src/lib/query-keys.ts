/**
 * React Query Keys
 *
 * Centralized query key management for type safety and consistency.
 * ใช้ pattern แบบ hierarchical เพื่อให้ invalidate queries ง่าย
 *
 * @example
 * ```ts
 * // Invalidate all dashboard queries
 * queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
 *
 * // Invalidate specific query
 * queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() })
 * ```
 */

export const queryKeys = {
  // ================================
  // Dashboard
  // ================================
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
    todayStats: () => [...queryKeys.dashboard.all, 'todayStats'] as const,
    todayBookings: () => [...queryKeys.dashboard.all, 'todayBookings'] as const,
    byStatus: () => [...queryKeys.dashboard.all, 'byStatus'] as const,
    revenue: (days: number) => [...queryKeys.dashboard.all, 'revenue', days] as const,
    miniStats: () => [...queryKeys.dashboard.all, 'miniStats'] as const,
  },

  // ================================
  // Bookings
  // ================================
  bookings: {
    all: ['bookings'] as const,
    list: (showArchived: boolean = false) =>
      [...queryKeys.bookings.all, 'list', { showArchived }] as const,
    byDateRange: (start: string, end: string, filters?: object) =>
      [...queryKeys.bookings.all, 'date-range', start, end, filters] as const,
    byCustomer: (customerId: string, showArchived: boolean = false) =>
      [...queryKeys.bookings.all, 'customer', customerId, { showArchived }] as const,
    detail: (id: string) => [...queryKeys.bookings.all, 'detail', id] as const,
  },

  // ================================
  // Customers
  // ================================
  customers: {
    all: ['customers'] as const,
    list: (showArchived: boolean = false) =>
      [...queryKeys.customers.all, 'list', { showArchived }] as const,
    detail: (id: string) => [...queryKeys.customers.all, 'detail', id] as const,
  },

  // ================================
  // Service Packages
  // ================================
  packages: {
    all: ['packages'] as const,
    v1: () => [...queryKeys.packages.all, 'v1'] as const,
    v2: () => [...queryKeys.packages.all, 'v2'] as const,
    unified: () => [...queryKeys.packages.all, 'unified'] as const,
  },

  // ================================
  // Staff & Teams
  // ================================
  staff: {
    all: ['staff'] as const,
    list: (filters?: { role?: string }) =>
      [...queryKeys.staff.all, 'list', filters] as const,
    listSimple: (role?: 'staff' | 'all') =>
      [...queryKeys.staff.all, 'list-simple', role] as const,
    withRatings: () => [...queryKeys.staff.all, 'with-ratings'] as const,
    detail: (id: string) => [...queryKeys.staff.all, 'detail', id] as const,
  },

  teams: {
    all: ['teams'] as const,
    list: (showArchived?: boolean) =>
      [...queryKeys.teams.all, 'list', { showArchived }] as const,
    listSimple: () => [...queryKeys.teams.all, 'list-simple'] as const,
    withDetails: (showArchived?: boolean) =>
      [...queryKeys.teams.all, 'with-details', { showArchived }] as const,
    detail: (id: string) => [...queryKeys.teams.all, 'detail', id] as const,
  },

  // ================================
  // Reports
  // ================================
  reports: {
    all: ['reports'] as const,
    bookings: () => [...queryKeys.reports.all, 'bookings'] as const,
    customers: () => [...queryKeys.reports.all, 'customers'] as const,
    staff: () => [...queryKeys.reports.all, 'staff'] as const,
    teams: () => [...queryKeys.reports.all, 'teams'] as const,
  },

  // ================================
  // Staff Portal - My Bookings
  // ================================
  staffBookings: {
    all: ['staff-bookings'] as const,
    teamMembership: (userId: string) =>
      [...queryKeys.staffBookings.all, 'teams', userId] as const,
    // Include membershipHash to ensure query refetches when membership periods change
    // This prevents stale closure issue where queryFn uses old allMembershipPeriods
    today: (userId: string, teamIds: string[], membershipHash?: string) =>
      [...queryKeys.staffBookings.all, 'today', userId, teamIds, membershipHash] as const,
    upcoming: (userId: string, teamIds: string[], membershipHash?: string) =>
      [...queryKeys.staffBookings.all, 'upcoming', userId, teamIds, membershipHash] as const,
    completed: (userId: string, teamIds: string[], membershipHash?: string) =>
      [...queryKeys.staffBookings.all, 'completed', userId, teamIds, membershipHash] as const,
    stats: (userId: string, teamIds: string[], membershipHash?: string) =>
      [...queryKeys.staffBookings.all, 'stats', userId, teamIds, membershipHash] as const,
  },

  // ================================
  // Staff Portal - My Calendar
  // ================================
  staffCalendar: {
    all: ['staff-calendar'] as const,
    teamMembership: (userId: string) =>
      [...queryKeys.staffCalendar.all, 'teams', userId] as const,
    // Include membershipHash to ensure query refetches when membership periods change
    events: (userId: string, teamIds: string[], membershipHash?: string) =>
      [...queryKeys.staffCalendar.all, 'events', userId, teamIds, membershipHash] as const,
  },
}
