import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * Form data structure for Service Package V1
 */
export interface PackageFormV1Data {
  name: string
  description: string
  service_type: string
  duration_minutes: string
  price: string
}

/**
 * Props for PackageFormV1 component
 */
export interface PackageFormV1Props {
  /** Form data state */
  formData: PackageFormV1Data
  /** Callback when form data changes */
  onFormDataChange: (data: PackageFormV1Data) => void
  /** Form submit handler */
  onSubmit: (e: React.FormEvent) => void
  /** Form cancel handler */
  onCancel: () => void
  /** Whether form is in editing mode (affects submit button text) */
  isEditing: boolean
}

/**
 * PackageFormV1 Component
 *
 * A form component for creating and editing Service Package V1 entries.
 * Extracted from service-packages.tsx to improve modularity.
 *
 * @component
 * @example
 * ```tsx
 * const [formData, setFormData] = useState<PackageFormV1Data>({
 *   name: '',
 *   description: '',
 *   service_type: '',
 *   duration_minutes: '',
 *   price: '',
 * })
 *
 * return (
 *   <PackageFormV1
 *     formData={formData}
 *     onFormDataChange={setFormData}
 *     onSubmit={handleSubmit}
 *     onCancel={handleCancel}
 *     isEditing={false}
 *   />
 * )
 * ```
 */
function PackageFormV1({
  formData,
  onFormDataChange,
  onSubmit,
  onCancel,
  isEditing,
}: PackageFormV1Props) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Package Name */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Package Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) =>
              onFormDataChange({ ...formData, name: e.target.value })
            }
            placeholder="e.g., Basic House Cleaning"
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) =>
              onFormDataChange({ ...formData, description: e.target.value })
            }
            placeholder="Package details..."
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Service Type */}
        <div className="space-y-2">
          <Label htmlFor="service_type">Service Type *</Label>
          <Select
            value={formData.service_type}
            onValueChange={(value) =>
              onFormDataChange({ ...formData, service_type: value })
            }
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cleaning">Cleaning</SelectItem>
              <SelectItem value="training">Training</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label htmlFor="duration_minutes">Duration (minutes) *</Label>
          <Input
            id="duration_minutes"
            type="number"
            min="1"
            value={formData.duration_minutes}
            onChange={(e) =>
              onFormDataChange({ ...formData, duration_minutes: e.target.value })
            }
            placeholder="e.g., 120"
            required
          />
        </div>

        {/* Price */}
        <div className="space-y-2">
          <Label htmlFor="price">Price (฿) *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) =>
              onFormDataChange({ ...formData, price: e.target.value })
            }
            placeholder="e.g., 99.99"
            required
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-tinedy-blue">
          {isEditing ? 'Update Package' : 'Create Package'}
        </Button>
      </div>
    </form>
  )
}

/**
 * Memoized version of PackageFormV1 component
 *
 * Prevents unnecessary re-renders when props haven't changed.
 * Useful when this form is used within larger components that
 * re-render frequently.
 */
export const PackageFormV1Memoized = React.memo(PackageFormV1)

PackageFormV1Memoized.displayName = 'PackageFormV1'

// Export memoized version as default for consistency with other components
export default PackageFormV1Memoized
