import { memo } from 'react'
import { Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface PackagesFiltersCardProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  typeFilter: string
  onTypeFilterChange: (value: string) => void
  pricingModelFilter: string
  onPricingModelFilterChange: (value: string) => void
}

function PackagesFiltersCardComponent({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  pricingModelFilter,
  onPricingModelFilterChange,
}: PackagesFiltersCardProps) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative sm:flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search packages..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 text-xs pl-8"
            />
          </div>
          {/* Type and Pricing filters */}
          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
            <Select value={typeFilter} onValueChange={onTypeFilterChange}>
              <SelectTrigger className="w-full sm:w-36 h-8 text-xs">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
                <SelectItem value="training">Training</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pricingModelFilter} onValueChange={onPricingModelFilterChange}>
              <SelectTrigger className="w-full sm:w-36 h-8 text-xs">
                <SelectValue placeholder="Filter by pricing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pricing</SelectItem>
                <SelectItem value="fixed">Fixed Price</SelectItem>
                <SelectItem value="tiered">Tiered Price</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

PackagesFiltersCardComponent.displayName = 'PackagesFiltersCard'

export const PackagesFiltersCard = memo(PackagesFiltersCardComponent)
