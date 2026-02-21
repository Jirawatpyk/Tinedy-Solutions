/**
 * Dashboard API Schemas (Phase 7)
 *
 * Zod schemas for validating dashboard API responses.
 * Covers stats, analytics, and reporting endpoints.
 */

import { z } from 'zod'

// ============================================================================
// DASHBOARD STATS SCHEMAS
// ============================================================================

/**
 * Overall dashboard stats response
 */
export const DashboardStatsResponseSchema = z.object({
  totalRevenue: z.number().min(0),
  totalBookings: z.number().int().min(0),
  totalCustomers: z.number().int().min(0),
  averageRating: z.number().min(0).max(5),

  // Comparison with previous period
  revenueChange: z.number(),
  bookingsChange: z.number(),
  customersChange: z.number(),
  ratingChange: z.number(),

  // Period info
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
})

/**
 * Today's stats response
 */
export const TodayStatsResponseSchema = z.object({
  todayRevenue: z.number().min(0),
  todayBookings: z.number().int().min(0),
  completedToday: z.number().int().min(0),
  pendingToday: z.number().int().min(0),
  cancelledToday: z.number().int().min(0),

  // Comparison with yesterday
  revenueChange: z.number(),
  bookingsChange: z.number(),
})

// ============================================================================
// BOOKING STATS SCHEMAS
// ============================================================================

/**
 * Bookings by status response
 */
export const BookingsByStatusResponseSchema = z.object({
  pending: z.number().int().min(0),
  confirmed: z.number().int().min(0),
  in_progress: z.number().int().min(0),
  completed: z.number().int().min(0),
  cancelled: z.number().int().min(0),
  no_show: z.number().int().min(0),

  total: z.number().int().min(0),

  // Percentages
  completionRate: z.number().min(0).max(100),
  cancellationRate: z.number().min(0).max(100),
  noShowRate: z.number().min(0).max(100),
})

/**
 * Today's bookings response
 */
export const TodayBookingsResponseSchema = z.array(z.object({
  id: z.string().uuid(),
  booking_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  payment_status: z.enum(['pending', 'partial', 'paid', 'refunded']),
  total_price: z.number(),

  // Customer info
  customer_name: z.string(),
  customer_phone: z.string().nullable(),

  // Service info
  package_name: z.string().nullable(),
  staff_name: z.string().nullable(),
  team_name: z.string().nullable(),
}))

// ============================================================================
// REVENUE SCHEMAS
// ============================================================================

/**
 * Daily revenue data point
 */
export const DailyRevenueDataPointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  revenue: z.number().min(0),
  bookings: z.number().int().min(0),
  averageValue: z.number().min(0),
})

/**
 * Daily revenue response (last 7 days)
 */
export const DailyRevenueResponseSchema = z.object({
  data: z.array(DailyRevenueDataPointSchema).length(7, 'Must have exactly 7 days of data'),
  total: z.number().min(0),
  average: z.number().min(0),
  trend: z.enum(['up', 'down', 'stable']),
})

/**
 * Monthly revenue data point
 */
export const MonthlyRevenueDataPointSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  revenue: z.number().min(0),
  bookings: z.number().int().min(0),
  averageValue: z.number().min(0),
})

/**
 * Monthly revenue response
 */
export const MonthlyRevenueResponseSchema = z.object({
  data: z.array(MonthlyRevenueDataPointSchema),
  total: z.number().min(0),
  average: z.number().min(0),
  trend: z.enum(['up', 'down', 'stable']),
  period: z.object({
    start: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
    end: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  }),
})

// ============================================================================
// PERFORMANCE SCHEMAS
// ============================================================================

/**
 * Staff performance data
 */
export const StaffPerformanceDataSchema = z.object({
  staff_id: z.string().uuid(),
  staff_name: z.string(),
  total_bookings: z.number().int().min(0),
  completed_bookings: z.number().int().min(0),
  total_revenue: z.number().min(0),
  average_rating: z.number().min(0).max(5),
  completion_rate: z.number().min(0).max(100),
})

/**
 * Staff performance response
 */
export const StaffPerformanceResponseSchema = z.object({
  data: z.array(StaffPerformanceDataSchema),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
})

/**
 * Team performance data
 */
export const TeamPerformanceDataSchema = z.object({
  team_id: z.string().uuid(),
  team_name: z.string(),
  member_count: z.number().int().min(0),
  total_bookings: z.number().int().min(0),
  completed_bookings: z.number().int().min(0),
  total_revenue: z.number().min(0),
  completion_rate: z.number().min(0).max(100),
})

/**
 * Team performance response
 */
export const TeamPerformanceResponseSchema = z.object({
  data: z.array(TeamPerformanceDataSchema),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
})

// ============================================================================
// CUSTOMER ANALYTICS SCHEMAS
// ============================================================================

/**
 * Customer analytics data
 */
export const CustomerAnalyticsDataSchema = z.object({
  totalCustomers: z.number().int().min(0),
  newCustomers: z.number().int().min(0),
  returningCustomers: z.number().int().min(0),
  activeCustomers: z.number().int().min(0),
  inactiveCustomers: z.number().int().min(0),

  // Metrics
  retentionRate: z.number().min(0).max(100),
  averageLifetimeValue: z.number().min(0),
  averageBookingsPerCustomer: z.number().min(0),
})

/**
 * Top customers response
 */
export const TopCustomersResponseSchema = z.array(z.object({
  customer_id: z.string().uuid(),
  customer_name: z.string(),
  total_bookings: z.number().int().min(0),
  total_spent: z.number().min(0),
  last_booking_date: z.string().nullable(),
}))

// ============================================================================
// SERVICE PACKAGE ANALYTICS SCHEMAS
// ============================================================================

/**
 * Package performance data
 */
export const PackagePerformanceDataSchema = z.object({
  package_id: z.string().uuid(),
  package_name: z.string(),
  package_version: z.enum(['v1', 'v2']),
  total_bookings: z.number().int().min(0),
  total_revenue: z.number().min(0),
  average_price: z.number().min(0),
  popularity_rank: z.number().int().min(1),
})

/**
 * Package performance response
 */
export const PackagePerformanceResponseSchema = z.object({
  data: z.array(PackagePerformanceDataSchema),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Dashboard Stats Types
export type DashboardStatsResponse = z.infer<typeof DashboardStatsResponseSchema>
export type TodayStatsResponse = z.infer<typeof TodayStatsResponseSchema>

// Booking Stats Types
export type BookingsByStatusResponse = z.infer<typeof BookingsByStatusResponseSchema>
export type TodayBookingsResponse = z.infer<typeof TodayBookingsResponseSchema>

// Revenue Types
export type DailyRevenueDataPoint = z.infer<typeof DailyRevenueDataPointSchema>
export type DailyRevenueResponse = z.infer<typeof DailyRevenueResponseSchema>
export type MonthlyRevenueDataPoint = z.infer<typeof MonthlyRevenueDataPointSchema>
export type MonthlyRevenueResponse = z.infer<typeof MonthlyRevenueResponseSchema>

// Performance Types
export type StaffPerformanceData = z.infer<typeof StaffPerformanceDataSchema>
export type StaffPerformanceResponse = z.infer<typeof StaffPerformanceResponseSchema>
export type TeamPerformanceData = z.infer<typeof TeamPerformanceDataSchema>
export type TeamPerformanceResponse = z.infer<typeof TeamPerformanceResponseSchema>

// Customer Analytics Types
export type CustomerAnalyticsData = z.infer<typeof CustomerAnalyticsDataSchema>
export type TopCustomersResponse = z.infer<typeof TopCustomersResponseSchema>

// Package Analytics Types
export type PackagePerformanceData = z.infer<typeof PackagePerformanceDataSchema>
export type PackagePerformanceResponse = z.infer<typeof PackagePerformanceResponseSchema>
