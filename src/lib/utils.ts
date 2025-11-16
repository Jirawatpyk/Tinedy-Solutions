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
