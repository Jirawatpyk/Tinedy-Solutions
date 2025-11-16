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

// Service Package V2 Types (Tiered Pricing)
// Enhanced service package types with area-based tiered pricing and frequency options
export * from './service-package-v2'

// Chat System Types
// Real-time chat messaging types including messages, conversations, and profiles
export * from './chat'

// Staff Types
// Staff management types including records, performance, availability, and forms
export * from './staff'

// Team Types
// Team management types including records, members, relations, stats, and forms
export * from './team'

// Supabase Relations
// Type definitions for Supabase queries with nested relations and helper utilities
export * from './supabase-relations'

// Common Types
// Shared types, utilities, and common definitions used across the application
export * from './common'

// Reports Types
// Reporting and analytics type definitions
export * from './reports'

// Database Types
// Supabase auto-generated database schema types
export * from './database.types'

