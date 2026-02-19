/**
 * Step4Confirm — Read-only summary + RT7 re-validate before submit
 *
 * Shows all collected fields in sections.
 * Each section has an [แก้ไข] link that uses GOTO_STEP (no validation).
 * Submit button calls validateFullState before mutation.
 */

import { User, Package, Calendar, MapPin, StickyNote, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import { formatDateRange } from '@/lib/date-range-utils'
import { PriceMode } from '@/types/booking'
import type { WizardState, WizardAction } from '@/hooks/use-booking-wizard'

interface Step4ConfirmProps {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
  staffName?: string
  teamName?: string
}

function SectionHeader({
  icon,
  title,
  onEdit,
  step,
  dispatch,
}: {
  icon: React.ReactNode
  title: string
  onEdit?: boolean
  step: 1 | 2 | 3 | 4
  dispatch: React.Dispatch<WizardAction>
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {title}
      </div>
      {onEdit && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1 text-tinedy-blue"
          onClick={() => dispatch({ type: 'GOTO_STEP', step })}
        >
          <Pencil className="h-3 w-3" />
          แก้ไข
        </Button>
      )}
    </div>
  )
}

export function Step4Confirm({ state, dispatch, staffName, teamName }: Step4ConfirmProps) {
  const {
    customer,
    isNewCustomer,
    newCustomerData,
    price_mode,
    selectedPackage,
    job_name,
    total_price,
    custom_price,
    booking_date,
    end_date,
    start_time,
    end_time,
    assignmentType,
    staff_id,
    team_id,
    address,
    city,
    state: stateField,
    zip_code,
    notes,
    area_sqm,
    frequency,
  } = state

  const displayPrice =
    price_mode === PriceMode.Package
      ? total_price
      : custom_price ?? 0

  const addressParts = [address, city, stateField, zip_code].filter(Boolean).join(', ')
  const dateDisplay = formatDateRange(booking_date, end_date)
  const timeDisplay = [start_time, end_time].filter(Boolean).join(' – ')

  const assignmentDisplay =
    assignmentType === 'none'
      ? 'ยังไม่กำหนด'
      : assignmentType === 'staff'
      ? staffName ?? staff_id ?? '-'
      : teamName ?? team_id ?? '-'

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold" tabIndex={-1}>ขั้นตอนที่ 4: ยืนยันการจอง</h2>

      {/* Customer section */}
      <div className="space-y-2">
        <SectionHeader
          icon={<User className="h-3.5 w-3.5" />}
          title="ลูกค้า"
          onEdit
          step={1}
          dispatch={dispatch}
        />
        <div className="pl-5 text-sm">
          {isNewCustomer ? (
            <div>
              <p className="font-medium">{newCustomerData.full_name} <Badge variant="secondary" className="text-xs ml-1">ลูกค้าใหม่</Badge></p>
              <p className="text-muted-foreground">{newCustomerData.phone}</p>
              {newCustomerData.email && (
                <p className="text-muted-foreground">{newCustomerData.email}</p>
              )}
            </div>
          ) : customer ? (
            <div>
              <p className="font-medium">{customer.full_name}</p>
              <p className="text-muted-foreground">{customer.phone}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">ยังไม่ได้เลือก</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Service & Schedule section */}
      <div className="space-y-2">
        <SectionHeader
          icon={<Package className="h-3.5 w-3.5" />}
          title="บริการ"
          onEdit
          step={2}
          dispatch={dispatch}
        />
        <div className="pl-5 space-y-1 text-sm">
          {price_mode === PriceMode.Custom ? (
            <p className="font-medium">{job_name || '-'} <Badge variant="outline" className="text-xs ml-1">Custom</Badge></p>
          ) : selectedPackage ? (
            <p className="font-medium">{selectedPackage.name}</p>
          ) : (
            <p className="text-muted-foreground">ยังไม่ได้เลือก</p>
          )}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-tinedy-blue">{formatCurrency(displayPrice)}</span>
            {price_mode === PriceMode.Override && (
              <Badge variant="secondary" className="text-xs">ปรับราคา</Badge>
            )}
          </div>
          {area_sqm && <p className="text-xs text-muted-foreground">พื้นที่ {area_sqm} ตร.ม.</p>}
          {frequency && <p className="text-xs text-muted-foreground">{frequency} ครั้ง/เดือน</p>}
        </div>
      </div>

      <Separator />

      {/* Date & Time section */}
      <div className="space-y-2">
        <SectionHeader
          icon={<Calendar className="h-3.5 w-3.5" />}
          title="วันเวลา"
          onEdit
          step={2}
          dispatch={dispatch}
        />
        <div className="pl-5 text-sm">
          <p className="font-medium">{dateDisplay || '-'}</p>
          {timeDisplay && <p className="text-muted-foreground">{timeDisplay}</p>}
        </div>
      </div>

      <Separator />

      {/* Assignment & Address section */}
      <div className="space-y-2">
        <SectionHeader
          icon={<MapPin className="h-3.5 w-3.5" />}
          title="นัดหมาย"
          onEdit
          step={3}
          dispatch={dispatch}
        />
        <div className="pl-5 space-y-1 text-sm">
          <p className="font-medium">{assignmentDisplay}</p>
          <p className="text-muted-foreground">{addressParts || '-'}</p>
        </div>
      </div>

      {/* Notes section (only if not empty) */}
      {notes && (
        <>
          <Separator />
          <div className="space-y-2">
            <SectionHeader
              icon={<StickyNote className="h-3.5 w-3.5" />}
              title="หมายเหตุ"
              onEdit
              step={3}
              dispatch={dispatch}
            />
            <p className="pl-5 text-sm text-muted-foreground">{notes}</p>
          </div>
        </>
      )}
    </div>
  )
}
