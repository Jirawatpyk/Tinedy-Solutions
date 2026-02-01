import { memo } from 'react'
import { Package, CheckCircle, XCircle } from 'lucide-react'
import { StatCard } from '@/components/common/StatCard/StatCard'

/**
 * Statistics for service packages
 */
export interface PackageStats {
  total: number
  active: number
  inactive: number
}

/**
 * Props for PackagesStatsSection component
 */
export interface PackagesStatsSectionProps {
  stats: PackageStats
}

/**
 * PackagesStatsSection - Displays statistics cards for service packages
 *
 * Shows three stat cards:
 * - Total Packages: Total count of all packages
 * - Active: Count of active packages
 * - Inactive: Count of inactive packages
 *
 * @example
 * ```tsx
 * <PackagesStatsSection
 *   stats={{ total: 10, active: 8, inactive: 2 }}
 * />
 * ```
 */
function PackagesStatsSectionComponent({ stats }: PackagesStatsSectionProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard
        title="Total Packages"
        value={stats.total}
        icon={Package}
        iconColor="text-tinedy-blue"
      />

      <StatCard
        title="Active"
        value={stats.active}
        icon={CheckCircle}
        iconColor="text-green-500"
      />

      <StatCard
        title="Inactive"
        value={stats.inactive}
        icon={XCircle}
        iconColor="text-gray-400"
      />
    </div>
  )
}

PackagesStatsSectionComponent.displayName = 'PackagesStatsSection'

export const PackagesStatsSection = memo(PackagesStatsSectionComponent)
