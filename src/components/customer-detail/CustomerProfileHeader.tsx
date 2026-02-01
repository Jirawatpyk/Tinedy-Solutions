import React from 'react'
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
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
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
    className: 'bg-gray-100 text-gray-700 border-gray-300',
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

const CustomerProfileHeader = React.memo(function CustomerProfileHeader({
  customer,
  onCreateBooking,
  onAddNote,
  onCopyLineId,
}: CustomerProfileHeaderProps) {
  const relationshipInfo =
    relationshipConfig[customer.relationship_level] ?? relationshipConfig.new

  return (
    <Card className="border-l-4 border-l-tinedy-blue">
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Customer Info */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-tinedy-dark">
                  {customer.full_name}
                </h2>
                <Badge
                  variant="outline"
                  className={relationshipInfo.className}
                >
                  {relationshipInfo.label}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary" className="text-xs">
                  {customer.preferred_contact_method.toUpperCase()}
                </Badge>

                {customer.source && (
                  <Badge variant="outline" className="text-xs">
                    Source:{' '}
                    {customer.source === 'other'
                      ? customer.source_other || 'Other'
                      : customer.source}
                  </Badge>
                )}

                {customer.tags &&
                  customer.tags.length > 0 &&
                  customer.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className={`text-xs ${getTagColor(tag)}`}
                    >
                      {tag}
                    </Badge>
                  ))}
              </div>
            </div>

            {/* Contact & Address Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-blue-600" />
                <a
                  href={`mailto:${customer.email}`}
                  className="text-tinedy-dark hover:text-tinedy-blue"
                >
                  {customer.email}
                </a>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-green-600" />
                <a
                  href={`tel:${customer.phone}`}
                  className="text-tinedy-dark hover:text-tinedy-blue"
                >
                  {customer.phone}
                </a>
              </div>

              {customer.line_id && (
                <div className="flex items-center gap-2 text-sm">
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  <span className="text-tinedy-dark">{customer.line_id}</span>
                </div>
              )}

              {customer.birthday && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span className="text-tinedy-dark">
                    {formatDate(customer.birthday)}
                  </span>
                </div>
              )}

              {customer.address && (
                <div className="flex items-start gap-2 text-sm md:col-span-2">
                  <MapPin className="h-4 w-4 text-orange-600 mt-0.5" />
                  <span className="text-tinedy-dark">
                    {customer.address}
                    {customer.city && `, ${customer.city}`}
                    {customer.state && `, ${customer.state}`}
                    {customer.zip_code && ` ${customer.zip_code}`}
                  </span>
                </div>
              )}

              {customer.company_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-indigo-600" />
                  <span className="text-tinedy-dark">
                    {customer.company_name}
                  </span>
                </div>
              )}

              {customer.tax_id && (
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4 text-slate-600" />
                  <span className="text-tinedy-dark">{customer.tax_id}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {customer.notes && (
              <div className="bg-muted/50 rounded-lg p-4 mt-4">
                <p className="text-sm font-medium mb-1">Notes:</p>
                <p className="text-sm text-muted-foreground">
                  {customer.notes}
                </p>
              </div>
            )}
          </div>

          {/* Quick Actions Sidebar */}
          <div className="lg:w-64 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              Quick Actions
            </h3>

            {/* Mobile: Icon buttons in a row */}
            <div className="flex lg:hidden items-center gap-2">
              <SimpleTooltip content="New Booking">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onCreateBooking}
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </SimpleTooltip>

              <SimpleTooltip content="Call Customer">
                <a href={`tel:${customer.phone}`} aria-label="Call Customer">
                  <Button variant="outline" size="icon">
                    <PhoneCall className="h-4 w-4" />
                  </Button>
                </a>
              </SimpleTooltip>

              <SimpleTooltip content="Send Email">
                <a href={`mailto:${customer.email}`} aria-label="Send Email">
                  <Button variant="outline" size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </a>
              </SimpleTooltip>

              {customer.line_id && (
                <SimpleTooltip content="Copy LINE ID">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onCopyLineId}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </SimpleTooltip>
              )}

              <SimpleTooltip content="Add Note">
                <Button variant="outline" size="icon" onClick={onAddNote}>
                  <Plus className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
            </div>

            {/* Desktop: Full buttons stacked */}
            <div className="hidden lg:flex lg:flex-col lg:space-y-2">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={onCreateBooking}
              >
                <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">New Booking</span>
              </Button>

              <a href={`tel:${customer.phone}`} className="block">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                >
                  <PhoneCall className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Call Customer</span>
                </Button>
              </a>

              <a href={`mailto:${customer.email}`} className="block">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Send className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Send Email</span>
                </Button>
              </a>

              {customer.line_id && (
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={onCopyLineId}
                >
                  <MessageCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Copy LINE ID</span>
                </Button>
              )}

              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={onAddNote}
              >
                <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">Add Note</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export default CustomerProfileHeader
