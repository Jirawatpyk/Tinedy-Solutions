/**
 * Calculate end time from start time and duration
 * @param startTime - Start time in HH:MM format
 * @param durationMinutes - Duration in minutes
 * @returns End time in HH:MM format
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  if (!startTime) return ''

  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + durationMinutes
  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMinutes = totalMinutes % 60

  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
}

/**
 * Get Bangkok date string in YYYY-MM-DD format
 * @returns Date string in Bangkok timezone
 */
export function getBangkokDateString(): string {
  const now = new Date()
  const bangkokOffset = 7 * 60 * 60 * 1000 // UTC+7
  const bangkokTime = new Date(now.getTime() + bangkokOffset)
  return bangkokTime.toISOString().split('T')[0]
}

/**
 * Get today's date range for Bangkok timezone
 * @returns Object with todayStr, todayStart, todayEnd
 */
export function getBangkokToday() {
  // ใช้ toLocaleString แทนการบวก offset เพื่อหลีกเลี่ยง double offset bug
  const now = new Date()
  const bangkokDateStr = now.toLocaleString('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).split(',')[0] // Format: YYYY-MM-DD

  const todayStr = bangkokDateStr

  return {
    todayStr,
    todayStart: `${todayStr}T00:00:00+07:00`,
    todayEnd: `${todayStr}T23:59:59+07:00`,
  }
}

/**
 * Get date N days ago in YYYY-MM-DD format
 * @param daysAgo - Number of days ago
 * @returns Date string
 */
export function getDateDaysAgo(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().split('T')[0]
}
