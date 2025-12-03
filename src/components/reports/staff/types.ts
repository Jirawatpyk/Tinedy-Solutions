/**
 * Staff Performance Types
 *
 * Shared types for staff performance components (Desktop & Mobile views)
 */

export interface StaffPerformanceData {
  id: string
  name: string
  email: string
  totalJobs: number
  completedJobs: number
  revenue: number
  completionRate: number
  avgJobValue: number
  utilizationRate: number
}

export interface StaffPerformanceProps {
  staffPerformance: StaffPerformanceData[]
}

/**
 * Get utilization label and emoji based on rate
 */
export function getUtilizationInfo(rate: number): { label: string; emoji: string; color: string } {
  if (rate >= 80) {
    return { label: 'High Utilization', emoji: '🟢', color: 'bg-green-500' }
  }
  if (rate >= 60) {
    return { label: 'Medium Utilization', emoji: '🟡', color: 'bg-yellow-500' }
  }
  return { label: 'Low Utilization', emoji: '🟠', color: 'bg-orange-500' }
}
