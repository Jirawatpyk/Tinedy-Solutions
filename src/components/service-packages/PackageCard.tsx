/**
 * PackageCard Component - Service Package Display Card
 *
 * Component แสดงข้อมูลแพ็คเก็จในรูปแบบ Card
 * รองรับทั้ง V1 (Fixed Pricing) และ V2 (Tiered Pricing)
 *
 * Features:
 * - แสดงข้อมูลแพ็คเก็จ
 * - รองรับทั้ง Fixed และ Tiered pricing
 * - Actions: Edit, Delete, Toggle Active
 * - Responsive design
 */

import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Package,
  Edit,
  MoreVertical,
  DollarSign,
  Clock,
  Users,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { DeleteButton } from '@/components/common/DeleteButton'
import { formatPrice } from '@/lib/pricing-utils'
import type { ServicePackageV2WithTiers } from '@/types'
import { PricingModel } from '@/types'

interface PackageCardProps {
  /** Package data (V2 with optional tiers) */
  package: ServicePackageV2WithTiers
  /** Edit handler */
  onEdit?: (pkg: ServicePackageV2WithTiers) => void
  /** Delete handler */
  onDelete?: (id: string) => Promise<void>
  /** Toggle active handler */
  onToggleActive?: (pkg: ServicePackageV2WithTiers) => void
  /** Show actions */
  showActions?: boolean
}

/**
 * Get service type badge
 */
function getServiceTypeBadge(type: string) {
  return type === 'cleaning' ? (
    <Badge className="bg-blue-500">Cleaning</Badge>
  ) : (
    <Badge className="bg-green-500">Training</Badge>
  )
}

/**
 * Get category badge
 */
function getCategoryBadge(category: string | null) {
  if (!category) return null

  const categoryMap: Record<string, { label: string; color: string }> = {
    office: { label: 'Office', color: 'bg-purple-500' },
    condo: { label: 'Condo', color: 'bg-orange-500' },
    house: { label: 'House', color: 'bg-teal-500' },
  }

  const config = categoryMap[category] || { label: category, color: 'bg-gray-500' }

  return <Badge className={config.color}>{config.label}</Badge>
}

/**
 * Get pricing model badge
 */
function getPricingModelBadge(model: string) {
  return model === 'tiered' ? (
    <Badge variant="outline" className="border-blue-500 text-blue-700">
      <MapPin className="h-3 w-3 mr-1" />
      Tiered
    </Badge>
  ) : (
    <Badge variant="outline" className="border-gray-500 text-gray-700">
      <DollarSign className="h-3 w-3 mr-1" />
      Fixed
    </Badge>
  )
}

/**
 * PackageCard Component
 */
export function PackageCard({
  package: pkg,
  onEdit,
  onDelete,
  onToggleActive,
  showActions = true,
}: PackageCardProps) {
  const navigate = useNavigate()
  const isTiered = pkg.pricing_model === PricingModel.Tiered
  const isActive = pkg.is_active

  // Both admin and manager use /admin routes
  const basePath = '/admin'

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons or dropdown
    if ((e.target as HTMLElement).closest('button, [role="menuitem"]')) {
      return
    }
    navigate(`${basePath}/packages/${pkg.id}`)
  }

  return (
    <Card
      className={`relative transition-all hover:shadow-md cursor-pointer ${!isActive ? 'opacity-60' : ''}`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Package Name */}
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-tinedy-blue flex-shrink-0" />
              <h3 className="font-semibold text-lg truncate">{pkg.name}</h3>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {getServiceTypeBadge(pkg.service_type)}
              {getPricingModelBadge(pkg.pricing_model)}
              {isTiered && pkg.category && getCategoryBadge(pkg.category)}
              {!isActive && <Badge variant="secondary">Inactive</Badge>}
            </div>
          </div>

          {/* Actions Menu */}
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(pkg)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleActive?.(pkg)}>
                  {isActive ? (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <DeleteButton
                    itemName={pkg.name}
                    onDelete={() => onDelete?.(pkg.id)}
                    variant="default"
                    size="sm"
                    className="w-full justify-start text-red-600"
                  />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Description */}
        {pkg.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{pkg.description}</p>
        )}

        {/* Fixed Pricing Info */}
        {!isTiered && pkg.base_price !== null && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4 mr-1" />
                Price
              </div>
              <span className="font-semibold text-lg text-tinedy-blue">
                {formatPrice(pkg.base_price)}
              </span>
            </div>

            {pkg.duration_minutes && (
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  Duration
                </div>
                <span className="text-sm font-medium">{pkg.duration_minutes} minutes</span>
              </div>
            )}
          </div>
        )}

        {/* Tiered Pricing Info */}
        {isTiered && (
          <div className="space-y-2 pt-2 border-t">
            {/* Tier Count */}
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mr-1" />
                Price Tiers
              </div>
              <Badge variant="secondary">{pkg.tier_count || 0} tiers</Badge>
            </div>

            {/* Price Range */}
            {pkg.min_price !== undefined && pkg.max_price !== undefined && (
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Price Range
                </div>
                <span className="text-sm font-medium">
                  {formatPrice(pkg.min_price)} - {formatPrice(pkg.max_price)}
                </span>
              </div>
            )}

            {/* Area Coverage */}
            {pkg.tiers && pkg.tiers.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1" />
                  Area Coverage
                </div>
                <span className="text-sm font-medium">
                  {pkg.tiers[0].area_min} - {pkg.tiers[pkg.tiers.length - 1].area_max} sqm
                </span>
              </div>
            )}

            {/* Staff Range */}
            {pkg.tiers && pkg.tiers.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="h-4 w-4 mr-1" />
                  Staff Required
                </div>
                <span className="text-sm font-medium">
                  {Math.min(...pkg.tiers.map((t) => t.required_staff))} -{' '}
                  {Math.max(...pkg.tiers.map((t) => t.required_staff))} staff
                </span>
              </div>
            )}
          </div>
        )}

        {/* Created Date */}
        <div className="flex items-center text-xs text-muted-foreground pt-2 border-t">
          <Calendar className="h-3 w-3 mr-1" />
          Created {new Date(pkg.created_at).toLocaleDateString('en-US')}
        </div>
      </CardContent>
    </Card>
  )
}
