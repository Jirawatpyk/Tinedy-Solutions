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

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-'
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

/** Return current Bangkok time as "HH:MM" string (UTC+7, same pattern as getBangkokDateString) */
export function getBangkokNowHHMM(): string {
  const now = new Date()
  const bangkokOffset = 7 * 60 * 60 * 1000 // UTC+7 in milliseconds
  const bangkokTime = new Date(now.getTime() + bangkokOffset)
  // toISOString gives "YYYY-MM-DDTHH:MM:SS.sssZ" in UTC — after adding offset, HH:MM is Bangkok time
  return bangkokTime.toISOString().slice(11, 16) // "HH:MM"
}

/** Convert "HH:MM" or "HH:MM:SS" string to minutes since midnight */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/**
 * Get Bangkok week date range (Mon–Sun) for the current Bangkok week
 * Uses toLocaleString pattern to avoid double-offset bug (same as getBangkokToday in dashboard-utils.ts)
 * @returns { weekStart: 'YYYY-MM-DD', weekEnd: 'YYYY-MM-DD' }
 */
export function getBangkokWeekRange(): { weekStart: string; weekEnd: string } {
  const now = new Date()
  const bangkokDateStr = now
    .toLocaleString('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .split(',')[0] // 'YYYY-MM-DD'

  const [year, month, day] = bangkokDateStr.split('-').map(Number)
  const bangkokDate = new Date(Date.UTC(year, month - 1, day))

  // dayOfWeek: 0=Sun, 1=Mon, ..., 6=Sat → shift to Mon=0
  const dayOfWeek = bangkokDate.getUTCDay()
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const monday = new Date(bangkokDate)
  monday.setUTCDate(bangkokDate.getUTCDate() + daysToMonday)

  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)

  return {
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0],
  }
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
  silver: 'bg-tinedy-dark/40 text-white',
  bronze: 'bg-amber-600 text-white',
  default: 'bg-tinedy-dark/30 text-tinedy-dark',
} as const

/**
 * Get rank badge color class based on position (0-indexed)
 * @example getRankBadgeColor(0) => 'bg-yellow-500 text-white' (gold)
 * @example getRankBadgeColor(1) => 'bg-tinedy-dark/40 text-white' (silver)
 * @example getRankBadgeColor(2) => 'bg-amber-600 text-white' (bronze)
 * @example getRankBadgeColor(5) => 'bg-tinedy-dark/30 text-tinedy-dark' (default)
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
