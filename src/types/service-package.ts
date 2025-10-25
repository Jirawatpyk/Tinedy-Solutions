/**
 * Service Package Type Definitions
 *
 * This module contains all TypeScript types related to service packages
 * in the Tinedy CRM application. Service packages represent the services
 * offered by the business (cleaning, training, etc.).
 *
 * @module types/service-package
 */

// ============================================================================
// SERVICE PACKAGE TYPES
// ============================================================================

/**
 * Service type enumeration
 *
 * @enum {string}
 *
 * @property {string} Cleaning - Cleaning services
 * @property {string} Training - Training services
 */
export const ServiceType = {
  Cleaning: 'cleaning',
  Training: 'training'
} as const

export type ServiceType = typeof ServiceType[keyof typeof ServiceType]

/**
 * Service Package Record
 *
 * Represents a service package from the service_packages table.
 * Used throughout the application for displaying and managing service offerings.
 *
 * @interface ServicePackage
 *
 * @property {string} id - Package UUID
 * @property {string} name - Package name (e.g., "Basic Cleaning", "Advanced Training")
 * @property {string | null} description - Detailed description of the service package
 * @property {ServiceType} service_type - Type of service (cleaning or training)
 * @property {number} duration_minutes - Duration of the service in minutes
 * @property {number} price - Price in Thai Baht
 * @property {boolean} is_active - Whether the package is currently available for booking
 * @property {string} created_at - ISO 8601 timestamp of creation
 *
 * @example
 * const package: ServicePackage = {
 *   id: "123e4567-e89b-12d3-a456-426614174000",
 *   name: "Deep Cleaning",
 *   description: "Comprehensive cleaning service",
 *   service_type: "cleaning",
 *   duration_minutes: 180,
 *   price: 2500,
 *   is_active: true,
 *   created_at: "2024-10-25T00:00:00Z"
 * }
 */
export interface ServicePackage {
  id: string
  name: string
  description: string | null
  service_type: ServiceType
  duration_minutes: number
  price: number
  is_active: boolean
  created_at: string
}

/**
 * Service Package with Relations
 *
 * Extended version of ServicePackage that may include related data
 * when fetched with joins in queries.
 *
 * @interface ServicePackageWithRelations
 * @extends ServicePackage
 *
 * @property {number} [booking_count] - Optional count of bookings using this package
 *
 * @example
 * const packageWithStats: ServicePackageWithRelations = {
 *   ...package,
 *   booking_count: 42
 * }
 */
export interface ServicePackageWithRelations extends ServicePackage {
  booking_count?: number
}

/**
 * Service Package Form Input
 *
 * Type for creating or updating service packages.
 * Omits read-only fields (id, created_at).
 *
 * @type ServicePackageInput
 *
 * @example
 * const input: ServicePackageInput = {
 *   name: "Premium Cleaning",
 *   description: "Top-tier cleaning service",
 *   service_type: "cleaning",
 *   duration_minutes: 240,
 *   price: 3500,
 *   is_active: true
 * }
 */
export type ServicePackageInput = Omit<ServicePackage, 'id' | 'created_at'>

/**
 * Service Package Update Input
 *
 * Type for partial updates to service packages.
 * All fields are optional.
 *
 * @type ServicePackageUpdate
 *
 * @example
 * const update: ServicePackageUpdate = {
 *   price: 2800,
 *   is_active: false
 * }
 */
export type ServicePackageUpdate = Partial<ServicePackageInput>
