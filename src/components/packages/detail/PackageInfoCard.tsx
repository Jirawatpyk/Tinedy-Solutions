import React from 'react'
import { Package } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { ServicePackageV2WithTiers } from '@/types'
import { PricingModel } from '@/types'

/**
 * Props for PackageInfoCard component
 */
interface PackageInfoCardProps {
  packageData: ServicePackageV2WithTiers
}

/**
 * PackageInfoCard Component
 *
 * Displays detailed information about a service package including:
 * - Package title and description
 * - Status badges (service type, pricing model, category, active status)
 * - Description text
 * - Created and updated timestamps
 *
 * @param props - Component props
 * @param props.packageData - Service package data with tiers
 */
const PackageInfoCard = React.memo(function PackageInfoCard({
  packageData
}: PackageInfoCardProps) {
  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-4 lg:gap-0">
          <div className="space-y-1 sm:space-y-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              Package Information
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Detailed information about this service package
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="capitalize text-xs sm:text-sm">{packageData.service_type}</Badge>
            <Badge className={`text-xs sm:text-sm ${packageData.pricing_model === PricingModel.Fixed ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
              {packageData.pricing_model === PricingModel.Fixed ? 'Fixed Price' : 'Tiered Price'}
            </Badge>
            {packageData.category && (
              <Badge variant="outline" className="capitalize text-xs sm:text-sm">{packageData.category}</Badge>
            )}
            <Badge className={`text-xs sm:text-sm ${packageData.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {packageData.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="text-xs sm:text-sm font-medium text-muted-foreground">Description</label>
            <p className="mt-1 text-xs sm:text-sm">{packageData.description || 'No description provided'}</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Created:</span>
              <span className="text-xs sm:text-sm">{formatDate(packageData.created_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Last Updated:</span>
              <span className="text-xs sm:text-sm">{formatDate(packageData.updated_at)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export { PackageInfoCard }
export type { PackageInfoCardProps }
