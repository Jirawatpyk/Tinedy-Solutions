/**
 * Customer Type Definitions
 *
 * This module contains all type definitions related to customer management in the Tinedy CRM system.
 * These types support customer records, relationship tracking, analytics, and customer segmentation.
 *
 * @module types/customer
 */

import type { BookingRecord } from './booking'

/**
 * Customer relationship levels for segmentation
 *
 * @enum {string}
 *
 * @property {string} New - First-time customer or recently added
 * @property {string} Regular - Repeat customer with regular bookings
 * @property {string} VIP - High-value customer with premium status
 * @property {string} Inactive - Customer who hasn't booked in a long time
 */
export const RelationshipLevel = {
  New: 'new',
  Regular: 'regular',
  VIP: 'vip',
  Inactive: 'inactive'
} as const

export type RelationshipLevel = typeof RelationshipLevel[keyof typeof RelationshipLevel]

/**
 * Preferred contact methods for customer communication
 *
 * @enum {string}
 *
 * @property {string} Phone - Contact via phone call
 * @property {string} Email - Contact via email
 * @property {string} Line - Contact via LINE messaging app (popular in Thailand)
 * @property {string} SMS - Contact via SMS text message
 */
export const PreferredContactMethod = {
  Phone: 'phone',
  Email: 'email',
  Line: 'line',
  SMS: 'sms'
} as const

export type PreferredContactMethod = typeof PreferredContactMethod[keyof typeof PreferredContactMethod]

/**
 * Customer acquisition sources for marketing attribution
 *
 * @enum {string}
 *
 * @property {string} Facebook - Found via Facebook
 * @property {string} Instagram - Found via Instagram
 * @property {string} Google - Found via Google Search
 * @property {string} Website - Found via company website
 * @property {string} Referral - Referred by existing customer
 * @property {string} WalkIn - Walk-in customer
 * @property {string} Other - Other source
 */
export const CustomerSource = {
  Facebook: 'facebook',
  Instagram: 'instagram',
  Google: 'google',
  Website: 'website',
  Referral: 'referral',
  WalkIn: 'walk-in',
  Other: 'other'
} as const

export type CustomerSource = typeof CustomerSource[keyof typeof CustomerSource]

/**
 * Core customer record representing a row in the customers database table
 *
 * This interface maps directly to the database schema and includes all fields
 * stored in the customers table. All dates are stored as ISO 8601 strings.
 *
 * @interface CustomerRecord
 *
 * @property {string} id - Unique identifier (UUID) for the customer
 * @property {string} full_name - Customer's full name
 * @property {string} email - Customer's email address (unique)
 * @property {string} phone - Customer's phone number
 * @property {string | null} line_id - Customer's LINE messaging ID, null if not provided
 * @property {string | null} address - Street address for service location, null if not provided
 * @property {string | null} city - City for service location, null if not provided
 * @property {string | null} state - State/province for service location, null if not provided
 * @property {string | null} zip_code - Postal/ZIP code for service location, null if not provided
 * @property {RelationshipLevel} relationship_level - Customer's relationship tier/status
 * @property {PreferredContactMethod} preferred_contact_method - How customer prefers to be contacted
 * @property {string[] | null} tags - Array of custom tags for categorization, null if no tags
 * @property {CustomerSource | null} source - How customer found the business, null if unknown
 * @property {string | null} source_other - Additional details when source is "other", null if not applicable
 * @property {string | null} birthday - Customer's birthday in ISO 8601 format (YYYY-MM-DD), null if not provided
 * @property {string | null} company_name - Company name for corporate customers, null if individual
 * @property {string | null} tax_id - Tax ID for invoicing, null if not provided
 * @property {string | null} notes - Additional notes about the customer, null if no notes
 * @property {string} created_at - Timestamp when the customer was created (ISO 8601)
 * @property {string} updated_at - Timestamp when the customer was last updated (ISO 8601)
 */
export interface CustomerRecord {
  id: string
  full_name: string
  email: string
  phone: string
  line_id: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  relationship_level: RelationshipLevel
  preferred_contact_method: PreferredContactMethod
  tags: string[] | null
  source: CustomerSource | null
  source_other: string | null
  birthday: string | null
  company_name: string | null
  tax_id: string | null
  notes: string | null
  relationship_level_locked?: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * Customer record with related entity data
 *
 * This interface extends CustomerRecord to include data from related tables
 * (bookings, tags). Used when fetching customer data with JOIN queries or
 * Supabase's relational queries.
 *
 * @interface CustomerWithRelations
 * @extends {CustomerRecord}
 *
 * @property {CustomerTag[] | null} customer_tags - Array of tag assignments with metadata
 * @property {BookingRecord[] | null} bookings - Array of customer's bookings
 * @property {Object | null} lifetime_stats - Customer lifetime statistics from analytics view
 * @property {number} lifetime_stats.total_bookings - Total number of bookings
 * @property {number} lifetime_stats.lifetime_value - Total revenue from customer
 * @property {number} lifetime_stats.avg_booking_value - Average booking value
 * @property {string | null} lifetime_stats.last_booking_date - Date of most recent booking
 */
export interface CustomerWithRelations extends CustomerRecord {
  customer_tags?: CustomerTag[] | null
  bookings?: BookingRecord[] | null
  lifetime_stats?: {
    total_bookings: number
    lifetime_value: number
    avg_booking_value: number
    last_booking_date: string | null
  } | null
}

// BookingRecord is imported from './booking' to avoid duplication
// The full BookingRecord type from booking.ts is used for customer relations

/**
 * Customer tag assignment with metadata
 *
 * Represents a tag assigned to a customer with additional tracking information.
 *
 * @interface CustomerTag
 *
 * @property {string} id - UUID of the tag assignment
 * @property {string} customer_id - UUID of the customer
 * @property {string} tag - Tag name/label
 * @property {string} created_at - When tag was assigned (ISO 8601)
 * @property {string | null} created_by - UUID of user who assigned the tag, null if system-assigned
 */
export interface CustomerTag {
  id: string
  customer_id: string
  tag: string
  created_at: string
  created_by: string | null
}

/**
 * Data structure for creating or updating a customer
 *
 * This interface represents the data required when submitting a customer form.
 * All required fields from CustomerRecord are included, while optional fields
 * are marked as optional. System-generated fields (id, created_at, updated_at)
 * are excluded.
 *
 * @interface CustomerFormData
 *
 * @property {string} full_name - Customer's full name (required)
 * @property {string} email - Customer's email address (required, must be unique)
 * @property {string} phone - Customer's phone number (required)
 * @property {string} [line_id] - Optional LINE messaging ID
 * @property {string} [address] - Optional street address
 * @property {string} [city] - Optional city
 * @property {string} [state] - Optional state/province
 * @property {string} [zip_code] - Optional postal/ZIP code
 * @property {RelationshipLevel} relationship_level - Customer relationship tier (defaults to 'new')
 * @property {PreferredContactMethod} preferred_contact_method - Preferred contact method (defaults to 'phone')
 * @property {string[]} [tags] - Optional array of tags
 * @property {CustomerSource} [source] - Optional acquisition source
 * @property {string} [birthday] - Optional birthday in ISO 8601 format
 * @property {string} [company_name] - Optional company name for corporate customers
 * @property {string} [tax_id] - Optional tax ID for invoicing
 * @property {string} [notes] - Optional notes about the customer
 */
export interface CustomerFormData {
  full_name: string
  email: string
  phone: string
  line_id?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  relationship_level: RelationshipLevel
  preferred_contact_method: PreferredContactMethod
  tags?: string[]
  source?: CustomerSource
  source_other?: string
  birthday?: string
  company_name?: string
  tax_id?: string
  notes?: string
}

/**
 * Filter criteria for querying customers
 *
 * This interface defines all available filter options for searching and
 * filtering customers in list views. All filters are optional and can be
 * combined.
 *
 * @interface CustomerFilters
 *
 * @property {string} searchQuery - Free text search query for name, email, phone, etc.
 * @property {RelationshipLevel[]} relationshipLevel - Array of relationship levels to include
 * @property {CustomerSource[]} source - Array of acquisition sources to include
 * @property {string[]} tags - Array of tags to filter by (customer must have at least one)
 * @property {boolean} [hasBookings] - Filter customers who have/haven't made bookings
 * @property {string} [createdAfter] - Filter customers created after this date (ISO 8601)
 * @property {string} [createdBefore] - Filter customers created before this date (ISO 8601)
 * @property {string} [lastBookingAfter] - Filter customers with last booking after this date
 * @property {string} [lastBookingBefore] - Filter customers with last booking before this date
 */
export interface CustomerFilters {
  searchQuery: string
  relationshipLevel: RelationshipLevel[]
  source: CustomerSource[]
  tags: string[]
  hasBookings?: boolean
  createdAfter?: string
  createdBefore?: string
  lastBookingAfter?: string
  lastBookingBefore?: string
}

/**
 * Customer analytics and lifetime value metrics
 *
 * This interface represents aggregated statistics about a customer's
 * booking history and value. Typically calculated from a database view
 * or analytics query.
 *
 * @interface CustomerMetrics
 *
 * @property {string} customer_id - UUID of the customer
 * @property {number} total_bookings - Total number of bookings (all statuses)
 * @property {number} completed_bookings - Number of completed bookings
 * @property {number} cancelled_bookings - Number of cancelled bookings
 * @property {number} no_show_bookings - Number of no-show bookings
 * @property {number} pending_bookings - Number of pending/upcoming bookings
 * @property {number} lifetime_value - Total revenue from all completed bookings
 * @property {number} avg_booking_value - Average value per completed booking
 * @property {string | null} first_booking_date - Date of first booking (ISO 8601), null if no bookings
 * @property {string | null} last_booking_date - Date of most recent booking (ISO 8601), null if no bookings
 * @property {number | null} days_since_last_booking - Days since last booking, null if no bookings
 * @property {number} customer_tenure_days - Days since customer was created
 * @property {number} booking_frequency - Average days between bookings (0 if less than 2 bookings)
 */
export interface CustomerMetrics {
  customer_id: string
  total_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  no_show_bookings: number
  pending_bookings: number
  lifetime_value: number
  avg_booking_value: number
  first_booking_date: string | null
  last_booking_date: string | null
  days_since_last_booking: number | null
  customer_tenure_days: number
  booking_frequency: number
}

/**
 * Top customer ranking for leaderboards and reports
 *
 * This interface represents a customer entry in a "top customers" list,
 * ranked by various metrics like revenue or booking count.
 *
 * @interface TopCustomer
 *
 * @property {string} id - Customer UUID
 * @property {string} name - Customer's full name
 * @property {string} email - Customer's email address
 * @property {number} total_bookings - Total number of bookings
 * @property {number} total_revenue - Total revenue from this customer
 * @property {string | null} last_booking_date - Date of most recent booking (ISO 8601), null if no bookings
 * @property {RelationshipLevel} relationship_level - Customer's relationship tier
 */
export interface TopCustomer {
  id: string
  name: string
  email: string
  total_bookings: number
  total_revenue: number
  last_booking_date: string | null
  relationship_level: RelationshipLevel
}

/**
 * Customer export format for CSV/Excel exports
 *
 * A flattened version of CustomerRecord optimized for export to spreadsheets.
 * Complex fields like arrays are converted to strings.
 *
 * @interface CustomerForExport
 *
 * @property {string} id - Customer UUID (shortened for readability)
 * @property {string} full_name - Customer's full name
 * @property {string} email - Customer's email address
 * @property {string} phone - Customer's phone number
 * @property {string} relationship_level - Customer's relationship tier
 * @property {string} created_at - When customer was created (formatted date)
 * @property {string} [line_id] - LINE messaging ID
 * @property {string} [address] - Full formatted address
 * @property {string} [tags] - Comma-separated list of tags
 * @property {string} [source] - Acquisition source
 */
export interface CustomerForExport {
  id: string
  full_name: string
  email: string
  phone: string
  relationship_level: string
  created_at: string
  line_id?: string
  address?: string
  tags?: string
  source?: string
}

/**
 * Customer segmentation summary
 *
 * Aggregated counts of customers by various segments for dashboard widgets
 * and analytics reports.
 *
 * @interface CustomerSegmentation
 *
 * @property {number} total - Total number of customers
 * @property {number} new - Customers with 'new' relationship level
 * @property {number} regular - Customers with 'regular' relationship level
 * @property {number} vip - Customers with 'vip' relationship level
 * @property {number} inactive - Customers with 'inactive' relationship level
 * @property {number} with_bookings - Customers who have made at least one booking
 * @property {number} without_bookings - Customers who haven't made any bookings yet
 * @property {number} recent - Customers created in the last 30 days
 */
export interface CustomerSegmentation {
  total: number
  new: number
  regular: number
  vip: number
  inactive: number
  with_bookings: number
  without_bookings: number
  recent: number
}
