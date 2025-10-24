/**
 * Centralized Type Definitions
 *
 * This barrel file exports all type definitions used throughout the application.
 * Import types from this file instead of individual type files.
 *
 * @example
 * import { BookingRecord, CustomerRecord, UserRole } from '@/types'
 */

// Booking Types
// Comprehensive booking management types including records, relations, forms, filters, and enums
export * from './booking'

// Customer Types
// Customer management types including records, relations, forms, filters, metrics, and enums
export * from './customer'

// Service Package Types
// Service package types including records, relations, forms, and enums
export * from './service-package'

// Chat System Types
// Real-time chat messaging types including messages, conversations, and profiles
export * from './chat'

// Database Types
// Supabase auto-generated database schema types
export * from './database.types'
