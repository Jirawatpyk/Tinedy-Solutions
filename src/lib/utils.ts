import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCurrency(amount: number): string {
  return '฿' + new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Get current date in Bangkok timezone (UTC+7) as YYYY-MM-DD string
 * This ensures payment_date is always correct regardless of browser timezone
 */
export function getBangkokDateString(): string {
  const now = new Date()
  const bangkokOffset = 7 * 60 * 60 * 1000 // UTC+7 in milliseconds
  const bangkokTime = new Date(now.getTime() + bangkokOffset)
  return bangkokTime.toISOString().split('T')[0]
}

// ============================================================================
// Avatar & Display Utilities
// ============================================================================

/**
 * Avatar background colors for consistent theming
 */
export const AVATAR_COLORS = [
  'bg-tinedy-blue',
  'bg-tinedy-green',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-rose-500',
] as const

/**
 * Get avatar background color by index (cycles through colors)
 */
export function getAvatarColor(index: number): string {
  if (typeof index !== 'number' || index < 0) return AVATAR_COLORS[0]
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

// ============================================================================
// Ranking Utilities
// ============================================================================

/**
 * Rank badge color configuration
 */
export const RANK_BADGE_COLORS = {
  gold: 'bg-yellow-500 text-white',
  silver: 'bg-gray-400 text-white',
  bronze: 'bg-amber-600 text-white',
  default: 'bg-gray-300 text-gray-700',
} as const

/**
 * Get rank badge color class based on position (0-indexed)
 * @example getRankBadgeColor(0) => 'bg-yellow-500 text-white' (gold)
 * @example getRankBadgeColor(1) => 'bg-gray-400 text-white' (silver)
 * @example getRankBadgeColor(2) => 'bg-amber-600 text-white' (bronze)
 * @example getRankBadgeColor(5) => 'bg-gray-300 text-gray-700' (default)
 */
export function getRankBadgeColor(index: number): string {
  if (typeof index !== 'number' || index < 0) return RANK_BADGE_COLORS.default

  switch (index) {
    case 0: return RANK_BADGE_COLORS.gold
    case 1: return RANK_BADGE_COLORS.silver
    case 2: return RANK_BADGE_COLORS.bronze
    default: return RANK_BADGE_COLORS.default
  }
}

// ============================================================================
// Booking ID Utilities
// ============================================================================

/**
 * Format a booking ID for display
 * Uses consistent format: #BK-XXXXXX (first 6 chars uppercase)
 * @example formatBookingId('6g12c6co-1234-5678-9abc-def012345678') => '#BK-6G12C6'
 */
export function formatBookingId(bookingId: string): string {
  if (!bookingId || typeof bookingId !== 'string') return '#BK-??????'
  return `#BK-${bookingId.substring(0, 6).toUpperCase()}`
}
