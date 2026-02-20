import { memo } from 'react'
import { Lock, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getTagColor } from '@/lib/tag-utils'
import { AUTO_TAGS } from '@/lib/customer-intelligence'
import type { CustomerRecord, RelationshipLevel } from '@/types'
import type { CustomerStats } from './CustomerMetricsSection'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const INACTIVE_RISK_DAYS = 120

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

interface CustomerIntelligenceCardProps {
  customer: CustomerRecord
  stats: CustomerStats | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CustomerIntelligenceCard = memo(function CustomerIntelligenceCard({
  customer,
  stats,
}: CustomerIntelligenceCardProps) {
  const relationshipInfo =
    relationshipConfig[customer.relationship_level] ?? relationshipConfig.new

  const autoTags = (customer.tags ?? []).filter((t) => AUTO_TAGS.includes(t))

  const isInactiveRisk =
    customer.relationship_level === 'vip' &&
    stats?.days_since_last_booking != null &&
    stats.days_since_last_booking > INACTIVE_RISK_DAYS

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-tinedy-dark">
          <Sparkles className="h-4 w-4 text-tinedy-blue" />
          Customer Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Relationship Level Row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground w-24 flex-shrink-0">
            Relationship
          </span>
          <Badge variant="outline" className={relationshipInfo.className}>
            {relationshipInfo.label}
          </Badge>
          {customer.relationship_level_locked && (
            <Badge
              variant="outline"
              className="text-xs bg-slate-100 text-slate-600 border-slate-300 flex items-center gap-1"
            >
              <Lock className="h-3 w-3" />
              Locked
            </Badge>
          )}
          {isInactiveRisk && (
            <Badge
              variant="outline"
              className="text-xs bg-orange-50 text-orange-600 border-orange-300"
            >
              ⚠️ Inactive Risk
            </Badge>
          )}
        </div>

        {/* Auto-Tags Row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground w-24 flex-shrink-0">
            Auto-tags
          </span>
          {autoTags.length > 0 ? (
            autoTags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className={`text-xs ${getTagColor(tag)}`}
              >
                {tag}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">
              None yet — earned at ฿15,000 spend or 5+ bookings
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

CustomerIntelligenceCard.displayName = 'CustomerIntelligenceCard'

export default CustomerIntelligenceCard
