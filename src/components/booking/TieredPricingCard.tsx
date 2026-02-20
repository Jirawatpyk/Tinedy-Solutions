/**
 * TieredPricingCard Component
 *
 * แสดงรายละเอียดราคาแบบ Tiered Pricing พร้อม:
 * - Tier breakdown
 * - Real-time price calculation
 * - Visual progress indicator
 * - Discount badge
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Ruler, Clock, AlertTriangle } from 'lucide-react'
import { calculatePricing } from '@/lib/pricing-utils'
import type { BookingFrequency, PricingCalculationResult } from '@/types/service-package-v2'

interface TieredPricingCardProps {
  servicePackageId: string
  areaSqm: number | null
  frequency: BookingFrequency
  /** Called when price is calculated (or 0 when area is cleared) */
  onPriceCalculated?: (price: number) => void
}

export function TieredPricingCard({
  servicePackageId,
  areaSqm,
  frequency,
  onPriceCalculated,
}: TieredPricingCardProps) {
  const [pricingResult, setPricingResult] = useState<PricingCalculationResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [prevPrice, setPrevPrice] = useState<number>(0)

  useEffect(() => {
    if (!areaSqm || areaSqm <= 0) {
      setPricingResult(null)
      onPriceCalculated?.(0)
      return
    }

    setIsCalculating(true)
    calculatePricing(servicePackageId, areaSqm, frequency)
      .then((result) => {
        if (result.found) {
          setPricingResult(prevResult => {
            if (prevResult?.price) {
              setPrevPrice(prevResult.price)
            }
            return result
          })
          onPriceCalculated?.(result.price)
        } else {
          setPricingResult(result)
          onPriceCalculated?.(0)
        }
      })
      .catch((error) => {
        console.error('Error calculating pricing:', error)
        setPricingResult(null)
      })
      .finally(() => {
        setTimeout(() => setIsCalculating(false), 300)
      })
  }, [servicePackageId, areaSqm, frequency, onPriceCalculated])

  // Empty State - ยังไม่กรอกพื้นที่ (ไม่แสดงอะไร)
  if (!areaSqm || areaSqm <= 0) {
    return null
  }

  // Loading State - กำลังคำนวณ
  if (isCalculating) {
    return (
      <Card className="border-green-200 bg-gradient-to-br from-green-50/30 to-transparent">
        <CardContent className="pt-4 pb-3 space-y-2.5">
          {/* Main Price Display Skeleton */}
          <div className="flex items-baseline justify-between">
            <div className="space-y-1">
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-6 w-24 bg-muted rounded-full animate-pulse" />
          </div>

          {/* Area Range Skeleton */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="h-3 w-12 bg-muted rounded animate-pulse" />
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              <div className="h-3 w-12 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-1.5 w-full bg-muted rounded animate-pulse" />
          </div>

          {/* Est. Duration Skeleton */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
            <div className="h-3 w-12 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error State - ไม่พบข้อมูลราคา
  if (!pricingResult || !pricingResult.tier) {
    return (
      <Card className="border-2 border-red-300 bg-red-50/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <CardTitle className="text-base text-red-900">No pricing found for this area</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-800 font-medium">
            Area <span className="font-bold">{areaSqm} sqm</span> may exceed the defined pricing range
          </p>
        </CardContent>
      </Card>
    )
  }

  const { tier, price, estimated_hours } = pricingResult
  const priceChanged = prevPrice !== price && prevPrice > 0

  // Calculate derived values from tier
  const tierName = `${tier.area_min}-${tier.area_max > 9000 ? '∞' : tier.area_max} sqm`

  // Calculate progress percentage (0-100 based on tier range)
  const tierRange = tier.area_max - tier.area_min
  const areaInTier = (areaSqm || 0) - tier.area_min
  const progressPercentage = Math.min(100, (areaInTier / tierRange) * 100)

  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50/30 to-transparent">
      <CardContent className="pt-4 pb-3 space-y-2.5">
        {/* Main Price Display */}
        <div className="flex items-baseline justify-between">
          <div>
            <div
              className={`text-2xl font-bold text-green-600 transition-all duration-500 ${
                priceChanged ? 'scale-110' : 'scale-100'
              }`}
            >
              ฿{price.toLocaleString()}
            </div>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs h-fit">
            {tierName}
          </Badge>
        </div>

        {/* Area Range with Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{tier.area_min} sqm</span>
            <div className="flex items-center gap-1">
              <Ruler className="h-3 w-3" />
              <span className="font-medium text-foreground">{areaSqm} sqm</span>
            </div>
            <span>{tier.area_max > 9000 ? '∞' : tier.area_max + ' sqm'}</span>
          </div>
          <Progress value={progressPercentage} className="h-1.5" />
        </div>

        {/* Estimated Hours */}
        {estimated_hours && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Est. Duration
            </span>
            <span className="font-semibold text-foreground">~{estimated_hours} hrs</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
