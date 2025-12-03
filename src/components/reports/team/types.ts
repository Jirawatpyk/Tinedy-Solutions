/**
 * Team Performance Types
 *
 * Shared types for team performance components (Desktop & Mobile views)
 */

export interface TeamPerformanceData {
  id: string
  name: string
  memberCount: number
  totalJobs: number
  completed: number
  inProgress: number
  pending: number
  revenue: number
  completionRate: number
}

export interface TeamPerformanceProps {
  teamPerformance: TeamPerformanceData[]
}

/**
 * Get completion rate label and color based on rate
 */
export function getCompletionInfo(rate: number): { label: string; color: string } {
  if (rate >= 80) {
    return { label: 'High', color: 'bg-green-500' }
  }
  if (rate >= 60) {
    return { label: 'Medium', color: 'bg-yellow-500' }
  }
  return { label: 'Low', color: 'bg-orange-500' }
}
