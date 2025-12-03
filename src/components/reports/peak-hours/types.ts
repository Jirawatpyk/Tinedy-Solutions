export interface PeakHourData {
  day: string
  hour: number
  count: number
}

export interface DayData {
  day: string
  hours: HourData[]
  totalBookings: number
}

export interface HourData {
  hour: number
  count: number
  intensity: number
}

export interface PeakHoursDetailData {
  day: string
  hour: number
  count: number
  formattedTime: string
}

export type DayOfWeek = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat'

export const DAYS_OF_WEEK: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const OPERATING_HOURS = { start: 8, end: 20 } // 08:00 - 20:00
