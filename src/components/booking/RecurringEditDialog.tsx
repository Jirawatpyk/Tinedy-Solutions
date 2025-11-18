/**
 * RecurringEditDialog Component
 *
 * Dialog สำหรับเลือก scope การแก้ไข recurring booking
 * - เฉพาะครั้งนี้
 * - ครั้งนี้และครั้งถัดไป
 * - ทั้งหมดในกลุ่ม
 */

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import type { RecurringEditScope } from '@/types/recurring-booking'
import { RecurringEditScope as Scope } from '@/types/recurring-booking'

interface RecurringEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (scope: RecurringEditScope) => void
  action: 'edit' | 'delete' | 'archive'
  recurringSequence: number
  recurringTotal: number
}

export function RecurringEditDialog({
  open,
  onOpenChange,
  onConfirm,
  action,
  recurringSequence,
  recurringTotal
}: RecurringEditDialogProps) {
  const [scope, setScope] = useState<RecurringEditScope>(Scope.ThisOnly)

  const actionText = action === 'edit' ? 'Edit' : action === 'archive' ? 'Archive' : 'Delete'

  const handleConfirm = () => {
    onConfirm(scope)
    onOpenChange(false)
  }

  // คำนวณจำนวน bookings ที่จะได้รับผลกระทบ
  const futureCount = recurringTotal - recurringSequence + 1

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {actionText} Recurring Booking
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            This is part of a recurring booking group (#{recurringSequence} of {recurringTotal})
            <br />
            Which bookings do you want to {actionText.toLowerCase()}?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <RadioGroup
            value={scope}
            onValueChange={(v) => setScope(v as RecurringEditScope)}
            className="space-y-4"
          >
            {/* This only */}
            <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 cursor-pointer transition-colors">
              <RadioGroupItem value={Scope.ThisOnly} id="this_only" className="mt-1" />
              <Label htmlFor="this_only" className="cursor-pointer flex-1">
                <div className="font-medium text-base">This booking only</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Only #{recurringSequence} will be {actionText.toLowerCase()}d
                </div>
              </Label>
            </div>

            {/* This and future - แสดงเฉพาะถ้าไม่ใช่ booking แรก และไม่ใช่ booking สุดท้าย */}
            {recurringSequence > 1 && recurringSequence < recurringTotal && (
              <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 cursor-pointer transition-colors">
                <RadioGroupItem value={Scope.ThisAndFuture} id="this_and_future" className="mt-1" />
                <Label htmlFor="this_and_future" className="cursor-pointer flex-1">
                  <div className="font-medium text-base">This and future bookings</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    #{recurringSequence} to #{recurringTotal} ({futureCount} bookings)
                  </div>
                </Label>
              </div>
            )}

            {/* All */}
            <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 cursor-pointer transition-colors">
              <RadioGroupItem value={Scope.All} id="all" className="mt-1" />
              <Label htmlFor="all" className="cursor-pointer flex-1">
                <div className="font-medium text-base">All bookings in this series</div>
                <div className="text-sm text-muted-foreground mt-1">
                  All {recurringTotal} bookings will be {actionText.toLowerCase()}d
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={action === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
