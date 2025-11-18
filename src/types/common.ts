/**
 * Common Type Definitions
 *
 * This module contains all common/shared TypeScript types and utilities used across
 * the Tinedy CRM application. These types support cross-cutting concerns like
 * pagination, filtering, date ranges, user roles, and API responses.
 *
 * @module types/common
 */

// ============================================================================
// USER ROLES & AUTHENTICATION
// ============================================================================

/**
 * User roles for access control and routing
 *
 * @enum {string}
 *
 * @property {string} Admin - Full system access, manages all resources including delete
 * @property {string} Manager - Operational management, CRUD except hard delete
 * @property {string} Staff - Limited access to staff portal and assigned bookings
 * @property {string} Customer - Customer portal access (not yet implemented)
 */
export const UserRole = {
  Admin: 'admin',
  Manager: 'manager',
  Staff: 'staff',
  Customer: 'customer'
} as const

export type UserRole = typeof UserRole[keyof typeof UserRole]

/**
 * User profile from the profiles table
 *
 * This interface represents the core user profile data extending Supabase auth.
 * Includes role, contact info, and metadata fields.
 *
 * @interface UserProfile
 *
 * @property {string} id - User UUID from auth.users
 * @property {string} email - User's email address
 * @property {string} full_name - User's full name
 * @property {string | null} avatar_url - URL to user's avatar image, null if not set
 * @property {UserRole} role - User's role for access control
 * @property {string | null} phone - User's phone number, null if not provided
 * @property {string | null} staff_number - Staff employee number (e.g., STF0001), null for non-staff
 * @property {string[] | null} skills - Array of staff member's skills, null if not applicable
 * @property {string} created_at - Timestamp when profile was created (ISO 8601)
 * @property {string} updated_at - Timestamp when profile was last updated (ISO 8601)
 */
export interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  phone: string | null
  staff_number: string | null
  skills: string[] | null
  created_at: string
  updated_at: string
}

// ============================================================================
// PERMISSIONS
// ============================================================================

/**
 * Permission action types
 *
 * @typedef {string} PermissionAction
 *
 * @property {'create'} create - Create new records
 * @property {'read'} read - Read/view records
 * @property {'update'} update - Update existing records
 * @property {'delete'} delete - Delete records
 * @property {'export'} export - Export data
 */
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'export'

/**
 * Resource types that can have permissions
 *
 * @typedef {string} PermissionResource
 */
export type PermissionResource =
  | 'bookings'
  | 'customers'
  | 'staff'
  | 'teams'
  | 'reports'
  | 'settings'
  | 'users'
  | 'service_packages'

/**
 * Permission set for a specific resource
 *
 * @interface Permission
 *
 * @property {boolean} create - Can create new records
 * @property {boolean} read - Can read/view records
 * @property {boolean} update - Can update existing records
 * @property {boolean} delete - Can delete records
 * @property {boolean} [export] - Can export data (optional)
 */
export interface Permission {
  create: boolean
  read: boolean
  update: boolean
  delete: boolean
  export?: boolean
}

/**
 * Map of permissions by resource name
 *
 * @type {Record<string, Permission>}
 */
export type PermissionMap = Record<PermissionResource, Permission>

/**
 * Role permission configuration
 *
 * @interface RolePermission
 *
 * @property {UserRole} role - User role
 * @property {PermissionMap} permissions - Permission map for all resources
 */
export interface RolePermission {
  role: UserRole
  permissions: Partial<PermissionMap>
}

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Pagination parameters for list views
 *
 * Standard pagination structure used across all paginated endpoints and components.
 * Supports both offset-based and cursor-based pagination patterns.
 *
 * @interface PaginationParams
 *
 * @property {number} page - Current page number (1-indexed)
 * @property {number} limit - Number of items per page
 * @property {number} [total] - Total number of items (optional, for UI display)
 * @property {number} [offset] - Offset for database queries (calculated as (page-1)*limit)
 */
export interface PaginationParams {
  page: number
  limit: number
  total?: number
  offset?: number
}

/**
 * Paginated response wrapper
 *
 * Generic wrapper for API responses that include pagination metadata.
 * Used when returning lists of items with pagination controls.
 *
 * @interface PaginatedResponse<T>
 * @template T - Type of items in the data array
 *
 * @property {T[]} data - Array of items for the current page
 * @property {PaginationParams} pagination - Pagination metadata
 * @property {number} pagination.page - Current page number
 * @property {number} pagination.limit - Items per page
 * @property {number} pagination.total - Total number of items across all pages
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}

// ============================================================================
// DATE RANGES
// ============================================================================

/**
 * Date range with nullable values
 *
 * Represents a date range selection where either boundary can be null.
 * Used in date range pickers and filters.
 *
 * @interface DateRange
 *
 * @property {Date | null} from - Start date of the range, null if not set
 * @property {Date | null} to - End date of the range, null if not set
 */
export interface DateRange {
  from: Date | null
  to: Date | null
}

/**
 * ISO date range with string dates
 *
 * Date range using ISO 8601 string format for API requests and database queries.
 * Strings are easier to serialize and validate than Date objects.
 *
 * @interface DateRangeISO
 *
 * @property {string | null} from - Start date in ISO 8601 format (YYYY-MM-DD), null if not set
 * @property {string | null} to - End date in ISO 8601 format (YYYY-MM-DD), null if not set
 */
export interface DateRangeISO {
  from: string | null
  to: string | null
}

/**
 * Predefined date range options for quick filtering
 *
 * Common preset time periods for analytics, reports, and filtering.
 * These presets are used across reports, analytics, and export functions.
 *
 * @typedef {string} DateRangePreset
 *
 * @property {'today'} today - Current day only
 * @property {'yesterday'} yesterday - Previous day only
 * @property {'last7days'} last7days - Last 7 days including today
 * @property {'last30days'} last30days - Last 30 days including today
 * @property {'thisWeek'} thisWeek - Current week (Sunday to Saturday)
 * @property {'lastWeek'} lastWeek - Previous week (Sunday to Saturday)
 * @property {'thisMonth'} thisMonth - Current calendar month
 * @property {'lastMonth'} lastMonth - Previous calendar month
 * @property {'last3months'} last3months - Last 3 months including current month
 * @property {'custom'} custom - User-defined custom date range
 */
export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'last3months'
  | 'custom'

// ============================================================================
// FILTERS & SORTING
// ============================================================================

/**
 * Sort order for list sorting
 *
 * @typedef {string} SortOrder
 *
 * @property {'asc'} asc - Ascending order (A to Z, 0 to 9, oldest to newest)
 * @property {'desc'} desc - Descending order (Z to A, 9 to 0, newest to oldest)
 */
export type SortOrder = 'asc' | 'desc'

/**
 * Sort configuration for a single field
 *
 * Defines how to sort a list by a specific field. Used in table headers
 * and list view controls.
 *
 * @interface SortConfig
 *
 * @property {string} field - Name of the field to sort by
 * @property {SortOrder} order - Sort direction (ascending or descending)
 */
export interface SortConfig {
  field: string
  order: SortOrder
}

/**
 * Generic filter options for data tables
 *
 * Base interface for filter configurations in data table components.
 * Specific tables extend this with their own filter fields.
 *
 * @interface FilterOptions
 *
 * @property {string} searchQuery - Free text search query
 * @property {SortConfig} [sort] - Optional sort configuration
 * @property {DateRangeISO} [dateRange] - Optional date range filter
 */
export interface FilterOptions {
  searchQuery: string
  sort?: SortConfig
  dateRange?: DateRangeISO
}

// ============================================================================
// API RESPONSES & ERROR HANDLING
// ============================================================================

/**
 * Standard API error response
 *
 * Consistent error format across all API responses and error handling utilities.
 * Includes message, optional code, and additional details.
 *
 * @interface ApiError
 *
 * @property {string} message - Human-readable error message
 * @property {string} [code] - Optional error code for programmatic handling
 * @property {Record<string, unknown>} [details] - Optional additional error details
 */
export interface ApiError {
  message: string
  code?: string
  details?: Record<string, unknown>
}

/**
 * Standard API success response wrapper
 *
 * Generic wrapper for successful API responses. Includes data payload and
 * optional success message for user feedback.
 *
 * @interface ApiResponse<T>
 * @template T - Type of the data payload
 *
 * @property {T} data - Response data payload
 * @property {string} [message] - Optional success message
 * @property {boolean} success - Always true for successful responses
 */
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

/**
 * API response that can be either success or error
 *
 * Discriminated union type for handling API responses that may succeed or fail.
 * Use TypeScript type guards to narrow the type.
 *
 * @typedef {Object} ApiResult<T>
 * @template T - Type of the data payload on success
 *
 * @property {boolean} success - true for success, false for error
 * @property {T} [data] - Data payload (only present when success=true)
 * @property {ApiError} [error] - Error object (only present when success=false)
 */
export type ApiResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: ApiError }

/**
 * Error with message interface
 *
 * Minimal error interface for error handling utilities.
 * Used in getErrorMessage() utility function.
 *
 * @interface ErrorWithMessage
 *
 * @property {string} message - Error message string
 */
export interface ErrorWithMessage {
  message: string
}

// ============================================================================
// ANALYTICS & METRICS
// ============================================================================

/**
 * Time series data point for charts
 *
 * Generic data point for time-based charts and graphs.
 * Used in revenue charts, booking trends, customer acquisition, etc.
 *
 * @interface TimeSeriesDataPoint
 *
 * @property {string} date - Date label (e.g., "Jan 2024", "2024-01-15")
 * @property {number} value - Numeric value for the data point
 * @property {string} [label] - Optional custom label for the data point
 */
export interface TimeSeriesDataPoint {
  date: string
  value: number
  label?: string
}

/**
 * Growth percentage calculation result
 *
 * Represents a percentage change between two periods with metadata.
 * Used in dashboard widgets and analytics cards.
 *
 * @interface GrowthMetric
 *
 * @property {number} current - Current period value
 * @property {number} previous - Previous period value
 * @property {number} percentage - Growth percentage (positive or negative)
 * @property {boolean} isPositive - Whether growth is positive (true) or negative (false)
 */
export interface GrowthMetric {
  current: number
  previous: number
  percentage: number
  isPositive: boolean
}

/**
 * Distribution data for pie/donut charts
 *
 * Generic data structure for categorical distribution charts.
 * Used in status breakdowns, segmentation charts, etc.
 *
 * @interface DistributionData
 *
 * @property {string} name - Category name
 * @property {number} value - Numeric value for the category
 * @property {string} [color] - Optional color for chart rendering
 * @property {number} [percentage] - Optional percentage of total (0-100)
 */
export interface DistributionData {
  name: string
  value: number
  color?: string
  percentage?: number
}

// ============================================================================
// EXPORT & REPORTING
// ============================================================================

/**
 * Export format options
 *
 * Supported export formats for data export functionality.
 *
 * @typedef {string} ExportFormat
 *
 * @property {'csv'} csv - Comma-separated values (Excel compatible with UTF-8 BOM)
 * @property {'xlsx'} xlsx - Excel spreadsheet format (not yet implemented)
 * @property {'pdf'} pdf - PDF document format (not yet implemented)
 * @property {'json'} json - JSON format for API integrations
 */
export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json'

/**
 * Export configuration options
 *
 * Configuration for data export operations including format,
 * date range, and filters.
 *
 * @interface ExportOptions
 *
 * @property {ExportFormat} format - Desired export format
 * @property {DateRangePreset | 'custom'} dateRange - Date range preset or 'custom'
 * @property {DateRangeISO} [customDateRange] - Custom date range (required if dateRange='custom')
 * @property {string[]} [fields] - Optional array of field names to include (all fields if not specified)
 * @property {FilterOptions} [filters] - Optional filters to apply before export
 */
export interface ExportOptions {
  format: ExportFormat
  dateRange: DateRangePreset | 'custom'
  customDateRange?: DateRangeISO
  fields?: string[]
  filters?: FilterOptions
}

// ============================================================================
// STATUS & ENUM TYPES
// ============================================================================

/**
 * Generic status type
 *
 * Common status values that appear across different entities.
 * Not all statuses apply to all entities.
 *
 * @typedef {string} Status
 *
 * @property {'active'} active - Entity is active/enabled
 * @property {'inactive'} inactive - Entity is inactive/disabled
 * @property {'pending'} pending - Entity is pending approval/action
 * @property {'archived'} archived - Entity has been archived
 */
export type Status = 'active' | 'inactive' | 'pending' | 'archived'

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Make specified properties of T optional
 *
 * Utility type to make specific properties of an interface optional.
 * Useful for update/patch operations where only some fields are required.
 *
 * @template T - Base interface type
 * @template K - Keys of T to make optional
 *
 * @example
 * type User = { id: string; name: string; email: string }
 * type UpdateUser = PartialBy<User, 'name' | 'email'>
 * // Result: { id: string; name?: string; email?: string }
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Make specified properties of T required
 *
 * Utility type to make specific properties of an interface required.
 * Useful for ensuring certain fields are present in specific contexts.
 *
 * @template T - Base interface type
 * @template K - Keys of T to make required
 *
 * @example
 * type User = { id: string; name?: string; email?: string }
 * type CreateUser = RequiredBy<User, 'name' | 'email'>
 * // Result: { id: string; name: string; email: string }
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

/**
 * Extract non-nullable type
 *
 * Utility type to remove null and undefined from a type.
 * Useful when you know a value will be present at runtime.
 *
 * @template T - Type that may include null or undefined
 *
 * @example
 * type MaybeString = string | null | undefined
 * type DefiniteString = NonNullable<MaybeString>
 * // Result: string
 */
export type NonNullable<T> = Exclude<T, null | undefined>

/**
 * Deep partial type
 *
 * Recursively makes all properties of T optional, including nested objects.
 * Useful for partial update payloads with nested structures.
 *
 * @template T - Type to make deeply optional
 *
 * @example
 * type User = { profile: { name: string; email: string } }
 * type PartialUser = DeepPartial<User>
 * // Result: { profile?: { name?: string; email?: string } }
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// ============================================================================
// FORM & VALIDATION
// ============================================================================

/**
 * Form field error
 *
 * Represents a validation error for a specific form field.
 * Used with form validation libraries and custom validation logic.
 *
 * @interface FieldError
 *
 * @property {string} field - Name of the field with the error
 * @property {string} message - Error message to display
 * @property {string} [type] - Optional error type (e.g., 'required', 'pattern', 'min')
 */
export interface FieldError {
  field: string
  message: string
  type?: string
}

/**
 * Form validation result
 *
 * Result of form validation including success status and any field errors.
 *
 * @interface ValidationResult
 *
 * @property {boolean} isValid - Whether the form is valid
 * @property {FieldError[]} errors - Array of field errors (empty if valid)
 */
export interface ValidationResult {
  isValid: boolean
  errors: FieldError[]
}

// ============================================================================
// NOTIFICATION & TOAST
// ============================================================================

/**
 * Toast notification variant
 *
 * Visual style variants for toast notifications.
 * Matches the design system's toast component variants.
 *
 * @typedef {string} ToastVariant
 *
 * @property {'default'} default - Default neutral style
 * @property {'success'} success - Success/confirmation style (green)
 * @property {'error'} error - Error/danger style (red)
 * @property {'warning'} warning - Warning/caution style (yellow)
 * @property {'info'} info - Informational style (blue)
 */
export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

/**
 * Toast notification options
 *
 * Configuration for displaying toast notifications to users.
 * Used with the useToast hook.
 *
 * @interface ToastOptions
 *
 * @property {string} title - Toast title
 * @property {string} [description] - Optional detailed description
 * @property {ToastVariant} [variant] - Visual variant (defaults to 'default')
 * @property {number} [duration] - Duration in milliseconds before auto-dismiss (defaults to 5000)
 * @property {boolean} [dismissible] - Whether user can dismiss the toast (defaults to true)
 */
export interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
  dismissible?: boolean
}

// ============================================================================
// ADDRESS & LOCATION
// ============================================================================

/**
 * Full address structure
 *
 * Complete address information for service locations.
 * Used in bookings and customer records.
 *
 * @interface Address
 *
 * @property {string} address - Street address (house number, street name)
 * @property {string} city - City name
 * @property {string | null} state - State/province name, null if not applicable
 * @property {string | null} zip_code - Postal/ZIP code, null if not applicable
 * @property {string | null} country - Country name (optional, defaults to Thailand)
 */
export interface Address {
  address: string
  city: string
  state: string | null
  zip_code: string | null
  country?: string | null
}

/**
 * Coordinates for map integration
 *
 * Geographic coordinates for location-based features.
 * Currently not used, but reserved for future map integration.
 *
 * @interface Coordinates
 *
 * @property {number} latitude - Latitude coordinate (-90 to 90)
 * @property {number} longitude - Longitude coordinate (-180 to 180)
 */
export interface Coordinates {
  latitude: number
  longitude: number
}
