import { memo } from 'react'
import { DollarSign, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import type { ServicePackageV2WithTiers } from '@/types'
import { PricingModel } from '@/types'

interface PackagePricingCardProps {
  packageData: ServicePackageV2WithTiers
}

/**
 * PackagePricingCard Component
 *
 * Displays pricing information for a service package.
 * Supports both Fixed and Tiered pricing models.
 *
 * Fixed: Shows base price and duration
 * Tiered: Shows price range, tier count, and detailed tiers table
 *
 * @param packageData - Service package data with tiers
 */
function PackagePricingCardComponent({ packageData }: PackagePricingCardProps) {
  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
          Pricing Information
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {packageData.pricing_model === PricingModel.Fixed ? (
          /* Fixed Pricing */
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between py-2 sm:py-3 border-b">
              <span className="text-xs sm:text-sm font-medium">Base Price:</span>
              <span className="text-base sm:text-lg font-bold text-tinedy-dark">
                {formatCurrency(packageData.base_price || 0)}
              </span>
            </div>
            {packageData.duration_minutes && (
              <div className="flex items-center justify-between py-2 sm:py-3 border-b">
                <span className="text-xs sm:text-sm font-medium flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Duration:
                </span>
                <span className="text-base sm:text-lg font-semibold">
                  {packageData.duration_minutes} minutes
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Tiered Pricing */
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
              <div>
                <p className="text-xs sm:text-sm font-medium">Price Range</p>
                <p className="text-xl sm:text-2xl font-bold text-tinedy-dark">
                  {formatCurrency(packageData.min_price || 0)} - {formatCurrency(packageData.max_price || 0)}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Tiers</p>
                <p className="text-lg sm:text-xl font-bold">{packageData.tier_count}</p>
              </div>
            </div>

            {/* Tiers - Mobile Card View */}
            {packageData.tiers && packageData.tiers.length > 0 && (
              <>
                {/* Mobile: Card View */}
                <div className="sm:hidden space-y-3">
                  {packageData.tiers.map((tier) => (
                    <div key={tier.id} className="border rounded-lg p-3 bg-gray-50/50">
                      <div className="mb-2">
                        <span className="font-semibold text-sm">{tier.area_min} - {tier.area_max} sqm</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">1 Time:</span>
                          <span className="font-medium">{formatCurrency(tier.price_1_time)}</span>
                        </div>
                        {tier.price_2_times && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">2 Times:</span>
                            <span className="font-medium">{formatCurrency(tier.price_2_times)}</span>
                          </div>
                        )}
                        {tier.price_4_times && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">4 Times:</span>
                            <span className="font-medium">{formatCurrency(tier.price_4_times)}</span>
                          </div>
                        )}
                        {tier.price_8_times && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">8 Times:</span>
                            <span className="font-medium">{formatCurrency(tier.price_8_times)}</span>
                          </div>
                        )}
                      </div>
                      {tier.estimated_hours && (
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Est. {tier.estimated_hours}h
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop: Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Area Range (sqm)</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">1 Time</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">2 Times</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">4 Times</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">8 Times</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">Est. Hours</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {packageData.tiers.map((tier) => (
                          <TableRow key={tier.id}>
                            <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                              {tier.area_min} - {tier.area_max}
                            </TableCell>
                            <TableCell className="text-right font-medium text-xs sm:text-sm whitespace-nowrap">
                              {formatCurrency(tier.price_1_time)}
                            </TableCell>
                            <TableCell className="text-right text-xs sm:text-sm whitespace-nowrap">
                              {tier.price_2_times ? formatCurrency(tier.price_2_times) : '-'}
                            </TableCell>
                            <TableCell className="text-right text-xs sm:text-sm whitespace-nowrap">
                              {tier.price_4_times ? formatCurrency(tier.price_4_times) : '-'}
                            </TableCell>
                            <TableCell className="text-right text-xs sm:text-sm whitespace-nowrap">
                              {tier.price_8_times ? formatCurrency(tier.price_8_times) : '-'}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-xs sm:text-sm whitespace-nowrap">
                              {tier.estimated_hours ? `${tier.estimated_hours}h` : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export const PackagePricingCard = memo(PackagePricingCardComponent)

PackagePricingCard.displayName = 'PackagePricingCard'
