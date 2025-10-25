/**
 * Booking Type Definitions
 *
 * This module contains all type definitions related to booking management in the Tinedy CRM system.
 * These types support the full booking lifecycle including creation, management, filtering, and status tracking.
 *
 * @module types/booking
 */

/**
 * Possible status values for a booking
 *
 * @enum {string}
 *
 * @property {string} Pending - Booking has been created but not yet confirmed
 * @property {string} Confirmed - Booking has been confirmed by staff or customer
 * @property {string} InProgress - Service is currently being performed
 * @property {string} Completed - Service has been successfully completed
 * @property {string} Cancelled - Booking was cancelled by staff or customer
 * @property {string} NoShow - Customer did not show up for the scheduled booking
 */
export const BookingStatus = {
  Pending: 'pending',
  Confirmed: 'confirmed',
  InProgress: 'in_progress',
  Completed: 'completed',
  Cancelled: 'cancelled',
  NoShow: 'no_show'
} as const

export type BookingStatus = typeof BookingStatus[keyof typeof BookingStatus]

/**
 * Payment status values for a booking
 *
 * @enum {string}
 *
 * @property {string} Unpaid - No payment has been received
 * @property {string} Paid - Full payment has been received
 * @property {string} Partial - Partial payment has been received
 * @property {string} Refunded - Payment has been refunded to customer
 */
export const PaymentStatus = {
  Unpaid: 'unpaid',
  Paid: 'paid',
  Partial: 'partial',
  Refunded: 'refunded'
} as const

export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus]

/**
 * Available payment methods
 *
 * @enum {string}
 *
 * @property {string} Cash - Cash payment
 * @property {string} Transfer - Bank transfer
 * @property {string} CreditCard - Credit card payment
 * @property {string} PromptPay - PromptPay mobile payment (Thailand)
 */
export const PaymentMethod = {
  Cash: 'cash',
  Transfer: 'transfer',
  CreditCard: 'credit_card',
  PromptPay: 'promptpay'
} as const

export type PaymentMethod = typeof PaymentMethod[keyof typeof PaymentMethod]

/**
 * Core booking record representing a row in the bookings database table
 *
 * This interface maps directly to the database schema and includes all fields
 * stored in the bookings table. All dates and times are stored as ISO 8601 strings.
 *
 * @interface BookingRecord
 *
 * @property {string} id - Unique identifier (UUID) for the booking
 * @property {string} booking_date - Date of the booking in ISO 8601 format (YYYY-MM-DD)
 * @property {string} start_time - Start time of the booking in HH:MM:SS format
 * @property {string | null} end_time - End time of the booking in HH:MM:SS format, null if not set
 * @property {string} customer_id - UUID of the customer who made the booking
 * @property {string | null} staff_id - UUID of the assigned staff member, null if assigned to team
 * @property {string | null} team_id - UUID of the assigned team, null if assigned to individual staff
 * @property {string} service_package_id - UUID of the booked service package
 * @property {number} total_price - Total price for the booking in decimal format
 * @property {BookingStatus} status - Current status of the booking
 * @property {PaymentStatus} payment_status - Current payment status
 * @property {PaymentMethod | null} payment_method - Method used for payment, null if unpaid
 * @property {string} address - Street address for the service location
 * @property {string} city - City for the service location
 * @property {string | null} state - State/province for the service location, null if not applicable
 * @property {string | null} zip_code - Postal/ZIP code for the service location, null if not applicable
 * @property {string | null} notes - Additional notes or special instructions for the booking
 * @property {string} created_at - Timestamp when the booking was created (ISO 8601)
 * @property {string} updated_at - Timestamp when the booking was last updated (ISO 8601)
 */
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

/**
 * Booking record with related entity data
 *
 * This interface extends BookingRecord to include data from related tables
 * (customers, staff, teams, service_packages). Used when fetching booking data
 * with JOIN queries or Supabase's relational queries.
 *
 * All related entities are optional (nullable) as they may not always be included
 * in the query or may have been deleted.
 *
 * @interface BookingWithRelations
 * @extends {BookingRecord}
 *
 * @property {Object | null} customer - Customer information
 * @property {string} customer.id - Customer UUID
 * @property {string} customer.full_name - Customer's full name
 * @property {string} customer.email - Customer's email address
 * @property {string | null} customer.phone - Customer's phone number, null if not provided
 *
 * @property {Object | null} staff - Assigned staff member information
 * @property {string} staff.id - Staff UUID
 * @property {string} staff.full_name - Staff member's full name
 * @property {string} staff.staff_number - Staff member's employee number
 *
 * @property {Object | null} team - Assigned team information
 * @property {string} team.id - Team UUID
 * @property {string} team.name - Team name
 *
 * @property {Object | null} service_packages - Service package information
 * @property {string} service_packages.id - Service package UUID
 * @property {string} service_packages.name - Service package name
 * @property {string} service_packages.service_type - Type/category of service
 * @property {number} service_packages.price - Base price of the service package
 * @property {number} service_packages.duration - Duration in minutes
 */
export interface BookingWithRelations extends BookingRecord {
  customer?: {
    id: string
    full_name: string
    email: string
    phone: string | null
  } | null
  staff?: {
    id: string
    full_name: string
    staff_number: string
  } | null
  team?: {
    id: string
    name: string
  } | null
  service_packages?: {
    id: string
    name: string
    service_type: string
    price: number
    duration: number
  } | null
}

/**
 * Booking with UI-specific relation names
 *
 * This interface represents a booking as used in the UI layer,
 * with slightly different relation naming (customers vs customer, profiles vs staff).
 * Used throughout the booking management pages and components.
 *
 * @interface Booking
 */
export interface Booking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  total_price: number
  address: string
  city: string
  state: string
  zip_code: string
  staff_id: string | null
  team_id: string | null
  service_package_id: string
  notes: string | null
  payment_status?: string
  payment_method?: string
  amount_paid?: number
  payment_date?: string
  payment_notes?: string
  customers: { id: string; full_name: string; email: string } | null
  service_packages: { name: string; service_type: string } | null
  profiles: { full_name: string } | null
  teams: { name: string } | null
}

/**
 * Minimal booking interface for status management
 *
 * Used by components that only need basic booking information
 * for status and payment operations.
 *
 * @interface BookingBase
 */
export interface BookingBase {
  id: string
  status: string
  payment_status?: string
  payment_method?: string
  total_price?: number
  amount_paid?: number
  payment_date?: string
}

/**
 * Data structure for creating or updating a booking
 *
 * This interface represents the data required when submitting a booking form.
 * All required fields from BookingRecord are included, while optional fields
 * are marked as optional. System-generated fields (id, created_at, updated_at)
 * are excluded.
 *
 * @interface BookingFormData
 *
 * @property {string} booking_date - Date of the booking in ISO 8601 format (YYYY-MM-DD)
 * @property {string} start_time - Start time in HH:MM:SS format
 * @property {string} [end_time] - Optional end time in HH:MM:SS format
 * @property {string} customer_id - UUID of the customer making the booking
 * @property {string} [staff_id] - Optional UUID of staff member to assign
 * @property {string} [team_id] - Optional UUID of team to assign
 * @property {string} service_package_id - UUID of the service package being booked
 * @property {number} total_price - Total price for the booking
 * @property {string} address - Street address for service location
 * @property {string} city - City for service location
 * @property {string} [state] - Optional state/province
 * @property {string} [zip_code] - Optional postal/ZIP code
 * @property {string} [notes] - Optional notes or special instructions
 */
export interface BookingFormData {
  booking_date: string
  start_time: string
  end_time?: string
  customer_id: string
  staff_id?: string
  team_id?: string
  service_package_id: string
  total_price: number
  address: string
  city: string
  state?: string
  zip_code?: string
  notes?: string
}

/**
 * Filter criteria for querying bookings
 *
 * This interface defines all available filter options for searching and
 * filtering bookings in list views. All filters are optional and can be
 * combined. Empty arrays are treated as "no filter" for that criterion.
 *
 * @interface BookingFilters
 *
 * @property {string} [dateFrom] - Filter bookings from this date onwards (ISO 8601 format)
 * @property {string} [dateTo] - Filter bookings up to this date (ISO 8601 format)
 * @property {BookingStatus[]} status - Array of booking statuses to include
 * @property {PaymentStatus[]} paymentStatus - Array of payment statuses to include
 * @property {string[]} serviceType - Array of service type IDs to include
 * @property {string[]} staffId - Array of staff member UUIDs to include
 * @property {string[]} teamId - Array of team UUIDs to include
 * @property {string} searchQuery - Free text search query for customer name, address, etc.
 */
export interface BookingFilters {
  dateFrom?: string
  dateTo?: string
  status: BookingStatus[]
  paymentStatus: PaymentStatus[]
  serviceType: string[]
  staffId: string[]
  teamId: string[]
  searchQuery: string
}

