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

export const DAY_NAMES: Record<DayOfWeek, string> = {
  Sun: 'Sunday',
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
} as const

export const PEAK_HOURS_COLORS = {
  empty: '#f3f4f6', // gray-100
  baseColor: { r: 143, g: 185, b: 150 }, // tinedy-green RGB
  text: {
    light: 'white',
    dark: '#374151', // gray-700
  },
} as const
