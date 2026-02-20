import { memo } from 'react'
import {
  Mail,
  Phone,
  MessageCircle,
  Calendar,
  MapPin,
  Building,
  CreditCard,
  PhoneCall,
  Send,
  Plus,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { getTagColor } from '@/lib/tag-utils'
import type { CustomerRecord, RelationshipLevel } from '@/types'

// ---------------------------------------------------------------------------
// Relationship display configuration
// ---------------------------------------------------------------------------

const relationshipConfig: Record<
  RelationshipLevel,
  { label: string; className: string }
> = {
  new: {
    label: '🆕 New',
    className: 'bg-tinedy-off-white text-tinedy-dark border-tinedy-dark/20',
  },
  regular: {
    label: '💚 Regular',
    className: 'bg-green-100 text-green-700 border-green-300',
  },
  vip: {
    label: '👑 VIP',
    className: 'bg-amber-100 text-amber-700 border-amber-300',
  },
  inactive: {
    label: '💤 Inactive',
    className: 'bg-red-100 text-red-700 border-red-300',
  },
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CustomerProfileHeaderProps {
  customer: CustomerRecord
  onCreateBooking: () => void
  onAddNote: () => void
  onCopyLineId: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CustomerProfileHeader = memo(function CustomerProfileHeader({
  customer,
  onCreateBooking,
  onAddNote,
  onCopyLineId,
}: CustomerProfileHeaderProps) {
  const relationshipInfo =
    relationshipConfig[customer.relationship_level] ?? relationshipConfig.new

  const initials = customer.full_name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Top: Avatar + Name + Relationship */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-tinedy-blue text-white flex items-center justify-center text-xl font-bold flex-shrink-0 select-none">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-tinedy-dark leading-tight">
              {customer.full_name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className={relationshipInfo.className}>
                {relationshipInfo.label}
              </Badge>
              {customer.source && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {customer.source === 'other'
                    ? customer.source_other || 'Other'
                    : customer.source}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Contact Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mb-4 text-sm">
          <a
            href={`mailto:${customer.email}`}
            className="flex items-center gap-2 text-tinedy-dark hover:text-tinedy-blue truncate"
          >
            <Mail className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="truncate">{customer.email}</span>
          </a>

          <a
            href={`tel:${customer.phone}`}
            className="flex items-center gap-2 text-tinedy-dark hover:text-tinedy-blue"
          >
            <Phone className="h-4 w-4 text-green-600 flex-shrink-0" />
            {customer.phone}
          </a>

          {customer.line_id && (
            <button
              onClick={onCopyLineId}
              className="flex items-center gap-2 text-tinedy-dark hover:text-tinedy-blue text-left"
            >
              <MessageCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              {customer.line_id}
            </button>
          )}

          {customer.birthday && (
            <div className="flex items-center gap-2 text-tinedy-dark">
              <Calendar className="h-4 w-4 text-purple-600 flex-shrink-0" />
              {formatDate(customer.birthday)}
            </div>
          )}

          {customer.company_name && (
            <div className="flex items-center gap-2 text-tinedy-dark">
              <Building className="h-4 w-4 text-indigo-600 flex-shrink-0" />
              {customer.company_name}
            </div>
          )}

          {customer.tax_id && (
            <div className="flex items-center gap-2 text-tinedy-dark">
              <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              {customer.tax_id}
            </div>
          )}

          {customer.address && (
            <div className="flex items-start gap-2 text-tinedy-dark sm:col-span-2">
              <MapPin className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <span>
                {[customer.address, customer.city, customer.state, customer.zip_code]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Tags */}
        {(customer.tags?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            <Badge variant="secondary" className="text-xs">
              {customer.preferred_contact_method.toUpperCase()}
            </Badge>
            {customer.tags!.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className={`text-xs ${getTagColor(tag)}`}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Bottom Action Bar */}
        <div className="border-t pt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            className="bg-tinedy-blue hover:bg-tinedy-blue/90"
            onClick={onCreateBooking}
          >
            <Calendar className="h-4 w-4 mr-1.5" />
            New Booking
          </Button>

          <a href={`tel:${customer.phone}`}>
            <Button variant="outline" size="sm">
              <PhoneCall className="h-4 w-4 mr-1.5" />
              Call
            </Button>
          </a>

          <a href={`mailto:${customer.email}`}>
            <Button variant="outline" size="sm">
              <Send className="h-4 w-4 mr-1.5" />
              Email
            </Button>
          </a>

          {customer.line_id && (
            <Button variant="outline" size="sm" onClick={onCopyLineId}>
              <MessageCircle className="h-4 w-4 mr-1.5" />
              Copy LINE
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={onAddNote}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Note
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})

CustomerProfileHeader.displayName = 'CustomerProfileHeader'

export default CustomerProfileHeader
